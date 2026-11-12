import {
  FieldValue,
  Firestore,
  Timestamp,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { Bite } from '../shared/model/bite';
import {
  LandingPage,
  LandingPageItem,
  LandingPageStatus,
} from '../shared/model/landing-page';
import { isListableBite } from '../shared/utils/bite-listability';
import { renderLandingPage } from '../shared/utils/render-landing-page';

/**
 * The operator side of city landing pages (epic #1487, issue #1490): list,
 * save, preview, publish and withdraw.
 *
 * Every write goes through a callable rather than a client write, so
 * `requireAdmin` and the operator log apply exactly as they do to every other
 * operator action, and the `landingPages` collection needs no client rule at
 * all.
 *
 * An entry is a Bite. Saving and publishing both **snapshot** the chosen Bites
 * into `items` - name, photo, restaurant and city - so a Bite that is later
 * renamed, delisted or deleted cannot change or break a page that is already
 * indexed. `biteIds` is kept beside the snapshot only so the editor can reopen
 * the selection; the public page never reads it.
 */

export const LANDING_PAGES_COLLECTION = 'landingPages';
const BITES_COLLECTION = 'bites';

export const MIN_ITEMS = 3;
export const MAX_ITEMS = 5;

/** The city segment: the document id and the whole URL path after `/eat/`. */
const CITY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;
const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

const LIMITS = {
  city: 60,
  cityName: 80,
  title: 120,
  metaDescription: 200,
  intro: 1200,
} as const;

/** What the editor sends. Everything is re-validated here. */
export interface LandingPageInput {
  city: string;
  cityName: string;
  countryCode: string;
  locale: string;
  title: string;
  metaDescription: string;
  intro: string;
  biteIds: string[];
}

/** What the editor reads back: the stored page with plain-number times. */
export interface LandingPageSummary extends LandingPageInput {
  status: LandingPageStatus;
  items: LandingPageItem[];
  publishedAt?: number;
  updatedAt?: number;
  updatedBy?: string;
}

const text = (
  value: unknown,
  field: keyof typeof LIMITS,
  required: boolean,
): string => {
  const result = typeof value === 'string' ? value.trim() : '';

  if (required && !result) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }

  if (result.length > LIMITS[field]) {
    throw new HttpsError(
      'invalid-argument',
      `${field} must be at most ${LIMITS[field]} characters.`,
    );
  }

  return result;
};

const matching = (
  value: string,
  pattern: RegExp,
  field: string,
  hint: string,
): string => {
  if (!pattern.test(value)) {
    throw new HttpsError('invalid-argument', `${field} must be ${hint}.`);
  }

  return value;
};

/** One page per city, so the city is the page's id (`/eat/<city>`). */
export const parseCity = (value: unknown): string =>
  matching(
    text(value, 'city', true),
    CITY_PATTERN,
    'city',
    'lowercase letters, digits and single hyphens',
  );

const parseBiteIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'biteIds must be a list.');
  }

  const ids = value.map((id) => (typeof id === 'string' ? id.trim() : ''));

  if (ids.some((id) => !id || id.includes('/'))) {
    throw new HttpsError('invalid-argument', 'biteIds holds an invalid id.');
  }

  if (new Set(ids).size !== ids.length) {
    throw new HttpsError('invalid-argument', 'A Bite appears twice.');
  }

  if (ids.length > MAX_ITEMS) {
    throw new HttpsError(
      'invalid-argument',
      `A page holds at most ${MAX_ITEMS} Bites.`,
    );
  }

  return ids;
};

export const parseLandingPageInput = (data: unknown): LandingPageInput => {
  const input = (data ?? {}) as Record<string, unknown>;

  return {
    city: parseCity(input['city']),
    cityName: text(input['cityName'], 'cityName', true),
    countryCode: matching(
      (typeof input['countryCode'] === 'string' ? input['countryCode'] : '')
        .trim()
        .toUpperCase(),
      COUNTRY_CODE_PATTERN,
      'countryCode',
      'a two-letter ISO code',
    ),
    locale: matching(
      (typeof input['locale'] === 'string' ? input['locale'] : '').trim(),
      LOCALE_PATTERN,
      'locale',
      'a language tag such as en or de-AT',
    ),
    title: text(input['title'], 'title', true),
    metaDescription: text(input['metaDescription'], 'metaDescription', false),
    intro: text(input['intro'], 'intro', false),
    biteIds: parseBiteIds(input['biteIds']),
  };
};

/**
 * Copies each Bite into the shape the public page renders.
 *
 * A Bite that is missing or not listable (its photo never arrived) is refused
 * by id rather than silently dropped: an operator who picked five and gets a
 * page of four has been misled, and a page with an empty image is worse.
 */
export const snapshotBites = async (
  db: Firestore,
  biteIds: string[],
): Promise<LandingPageItem[]> => {
  if (biteIds.length === 0) {
    return [];
  }

  const refs = biteIds.map((id) => db.collection(BITES_COLLECTION).doc(id));
  const snaps = await db.getAll(...refs);
  const unusable: string[] = [];

  const items = snaps.map((snap, index): LandingPageItem | undefined => {
    const bite = snap.exists ? (snap.data() as Bite) : undefined;

    if (!bite || !isListableBite(bite) || !bite.imagePath) {
      unusable.push(biteIds[index]);
      return undefined;
    }

    const item: LandingPageItem = {
      biteId: biteIds[index],
      name: bite.name ?? '',
      imageUrl: bite.imagePath,
      place: bite.place ?? '',
    };

    if (bite.city) {
      item.locality = bite.city;
    }

    return item;
  });

  if (unusable.length) {
    throw new HttpsError(
      'failed-precondition',
      `These Bites cannot be shown: ${unusable.join(', ')}.`,
    );
  }

  return items as LandingPageItem[];
};

/**
 * What a page must have before the public may see it. Checked on publish, and
 * on every save of a page that is already live, so an edit cannot take a
 * published page below the bar.
 */
export const assertPublishable = (
  page: Pick<LandingPageInput, 'metaDescription' | 'intro'> & {
    items: unknown[];
  },
): void => {
  if (page.items.length < MIN_ITEMS || page.items.length > MAX_ITEMS) {
    throw new HttpsError(
      'failed-precondition',
      `A published page needs ${MIN_ITEMS} to ${MAX_ITEMS} Bites.`,
    );
  }

  if (!page.metaDescription) {
    throw new HttpsError(
      'failed-precondition',
      'A published page needs a meta description.',
    );
  }

  if (!page.intro) {
    throw new HttpsError(
      'failed-precondition',
      'A published page needs an intro.',
    );
  }
};

const millis = (value: unknown): number | undefined =>
  value instanceof Timestamp ? value.toMillis() : undefined;

const toSummary = (data: Record<string, unknown>): LandingPageSummary => ({
  city: String(data['city'] ?? ''),
  cityName: String(data['cityName'] ?? ''),
  countryCode: String(data['countryCode'] ?? ''),
  locale: String(data['locale'] ?? ''),
  title: String(data['title'] ?? ''),
  metaDescription: String(data['metaDescription'] ?? ''),
  intro: String(data['intro'] ?? ''),
  biteIds: Array.isArray(data['biteIds']) ? (data['biteIds'] as string[]) : [],
  items: Array.isArray(data['items'])
    ? (data['items'] as LandingPageItem[])
    : [],
  status: (data['status'] as LandingPageStatus) ?? 'draft',
  publishedAt: millis(data['publishedAt']),
  updatedAt: millis(data['updatedAt']),
  updatedBy:
    typeof data['updatedBy'] === 'string' ? data['updatedBy'] : undefined,
});

/** Every page, newest edit first. Read-only, so it is not logged. */
export const listLandingPagesHandler = async (
  request: CallableRequest<unknown>,
): Promise<LandingPageSummary[]> => {
  requireAdmin(request);

  const snap = await getFirestore().collection(LANDING_PAGES_COLLECTION).get();

  return snap.docs
    .map((doc) => toSummary({ ...doc.data(), city: doc.id }))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
};

/**
 * Creates or updates a page's content and re-snapshots its Bites.
 *
 * A new page is a draft. An existing page keeps its status, which means an
 * edit to a published page goes live with the save - and is therefore held to
 * the publishing bar.
 */
export const saveLandingPageHandler = async (
  request: CallableRequest<unknown>,
): Promise<LandingPageSummary> => {
  const uid = requireAdmin(request);
  const input = parseLandingPageInput(request.data);
  const db = getFirestore();
  const ref = db.collection(LANDING_PAGES_COLLECTION).doc(input.city);

  const existing = await ref.get();
  const status: LandingPageStatus = existing.exists
    ? ((existing.data()?.['status'] as LandingPageStatus) ?? 'draft')
    : 'draft';
  const items = await snapshotBites(db, input.biteIds);

  if (status === 'published') {
    assertPublishable({ ...input, items });
  }

  await ref.set(
    {
      ...input,
      items,
      status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );

  logOperatorAction(request, {
    action: 'saveLandingPage',
    targetType: 'landingPage',
    targetId: input.city,
    outcome: 'succeeded',
    details: {
      created: !existing.exists,
      status,
      biteIds: input.biteIds,
    },
  });

  return toSummary((await ref.get()).data() ?? {});
};

/**
 * Renders what the page would look like, from what is in the editor, without
 * writing anything. The same template the public function serves, so the
 * preview cannot drift from the page.
 */
export const previewLandingPageHandler = async (
  request: CallableRequest<unknown>,
): Promise<{ html: string }> => {
  requireAdmin(request);
  const input = parseLandingPageInput(request.data);
  const items = await snapshotBites(getFirestore(), input.biteIds);
  const page: LandingPage = {
    ...input,
    items,
    status: 'draft',
    updatedAt: Timestamp.now(),
  };

  return { html: renderLandingPage(page) };
};

interface SetStatusRequest {
  city?: unknown;
  status?: unknown;
}

/**
 * Publishes or withdraws a saved page.
 *
 * Publishing re-snapshots the Bites, so what goes live is what the Bites look
 * like now rather than at the last save. Withdrawing keeps the document and
 * its URL answers 410, so a search engine drops it instead of retrying.
 */
export const setLandingPageStatusHandler = async (
  request: CallableRequest<SetStatusRequest>,
): Promise<LandingPageSummary> => {
  const uid = requireAdmin(request);
  const city = parseCity(request.data?.city);
  const status = request.data?.status;

  if (status !== 'published' && status !== 'withdrawn') {
    throw new HttpsError(
      'invalid-argument',
      'status must be published or withdrawn.',
    );
  }

  const db = getFirestore();
  const ref = db.collection(LANDING_PAGES_COLLECTION).doc(city);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new HttpsError('not-found', `No landing page for ${city}.`);
  }

  const stored = toSummary({ ...snap.data(), city });
  const update: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: uid,
  };

  if (status === 'published') {
    const items = await snapshotBites(db, stored.biteIds);
    assertPublishable({ ...stored, items });
    update['items'] = items;
    update['publishedAt'] = FieldValue.serverTimestamp();
  }

  await ref.update(update);

  logOperatorAction(request, {
    action: 'setLandingPageStatus',
    targetType: 'landingPage',
    targetId: city,
    outcome: 'succeeded',
    details: { from: stored.status, to: status },
  });

  return toSummary({ ...(await ref.get()).data(), city });
};

export const listLandingPages = onAppCheck(listLandingPagesHandler);
export const saveLandingPage = onAppCheck(saveLandingPageHandler);
export const previewLandingPage = onAppCheck(previewLandingPageHandler);
export const setLandingPageStatus = onAppCheck<SetStatusRequest>(
  setLandingPageStatusHandler,
);
