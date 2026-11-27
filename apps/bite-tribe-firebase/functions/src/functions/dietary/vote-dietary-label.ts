import { getAuth } from 'firebase-admin/auth';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { checkContent } from '../shared/moderation/check-content';
import { recordContentRefusal } from '../shared/moderation/content-refusal';
import { requireMember } from '../shared/roles';
import {
  isRestaurantOwner,
  RESTAURANT_COLLECTION,
} from '../restaurants/restaurant-authority';
import {
  biteScopeKey,
  DIETARY_LABEL_TALLIES_COLLECTION,
  DIETARY_LABEL_VOTES_COLLECTION,
  DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS,
  DietaryDisputeReason,
  DietaryLabel,
  DietaryLabelTally,
  DietaryVote,
  isDietaryDisputeReason,
  isDietaryLabel,
  isDietaryVote,
  MAX_DIETARY_VOTE_NOTE_LENGTH,
  menuScopeKey,
  ownVotesId,
  scopeItemsOf,
  shiftTally,
  StoredDietaryVote,
  tallyOf,
} from './dietary-votes';

const BITES_COLLECTION = 'bites';
const MENUS_COLLECTION = 'menus';
const DAY_MS = 24 * 60 * 60 * 1000;

export interface VoteDietaryLabelRequest {
  target?: unknown;
  label?: unknown;
  vote?: unknown;
  reason?: unknown;
  note?: unknown;
}

export type DietaryVoteIneligibleReason =
  'own-bite' | 'restaurant-holder' | 'account-too-new' | 'no-own-bite';

export type VoteDietaryLabelResponse =
  | { status: 'saved'; tally: DietaryLabelTally }
  | { status: 'ineligible'; reason: DietaryVoteIneligibleReason }
  | { status: 'refused'; field: 'note' };

type Target =
  | { type: 'bite'; biteId: string }
  | { type: 'menuItem'; restaurantId: string; menuItemId: string };

const parseId = (value: unknown, field: string): string => {
  const id = typeof value === 'string' ? value.trim() : '';

  if (!id || id.includes('/') || id.includes('__')) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }

  return id;
};

const parseTarget = (value: unknown): Target => {
  const target = (value ?? {}) as Record<string, unknown>;

  if (target['type'] === 'bite') {
    return { type: 'bite', biteId: parseId(target['biteId'], 'biteId') };
  }

  if (target['type'] === 'menuItem') {
    return {
      type: 'menuItem',
      restaurantId: parseId(target['restaurantId'], 'restaurantId'),
      menuItemId: parseId(target['menuItemId'], 'menuItemId'),
    };
  }

  throw new HttpsError('invalid-argument', 'target is not a Bite or a dish.');
};

const parseLabel = (value: unknown): DietaryLabel => {
  if (!isDietaryLabel(value)) {
    throw new HttpsError('invalid-argument', 'label is not a dietary label.');
  }

  return value;
};

const parseVote = (value: unknown): DietaryVote => {
  if (!isDietaryVote(value)) {
    throw new HttpsError('invalid-argument', 'vote is confirm or dispute.');
  }

  return value;
};

/** A dispute says why, from the fixed list; a confirmation says nothing. */
const parseReason = (
  vote: DietaryVote,
  value: unknown,
): DietaryDisputeReason | undefined => {
  if (vote === 'confirm') {
    return undefined;
  }

  if (!isDietaryDisputeReason(value)) {
    throw new HttpsError('invalid-argument', 'reason is not a known reason.');
  }

  return value;
};

const parseNote = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'note must be text.');
  }

  const note = value.trim();

  if (note.length > MAX_DIETARY_VOTE_NOTE_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `note must be at most ${MAX_DIETARY_VOTE_NOTE_LENGTH} characters.`,
    );
  }

  return note;
};

const labelsOf = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

/** A row of a stored menu: a dish or one of its variants, by id. */
const findMenuRow = (
  menu: DocumentData | undefined,
  menuItemId: string,
): DocumentData | undefined => {
  const findIn = (items: unknown): DocumentData | undefined => {
    for (const item of Array.isArray(items) ? items : []) {
      if (item?.id === menuItemId) {
        return item;
      }

      const variant = findIn(item?.variants);

      if (variant) {
        return variant;
      }
    }

    return undefined;
  };

  for (const category of Array.isArray(menu?.['categories'])
    ? menu['categories']
    : []) {
    const row = findIn(category?.items);

    if (row) {
      return row;
    }
  }

  return undefined;
};

interface ResolvedTarget {
  scopeKey: string;
  subjectId: string;
  claimedLabels: unknown[];
  creatorUid?: string;
  restaurantId?: string;
  restaurant?: DocumentData;
}

const resolveTarget = async (target: Target): Promise<ResolvedTarget> => {
  const db = getFirestore();

  if (target.type === 'bite') {
    const bite = await db.collection(BITES_COLLECTION).doc(target.biteId).get();

    if (!bite.exists) {
      throw new HttpsError('not-found', 'Bite was not found.');
    }

    const data = bite.data() ?? {};
    const restaurantId =
      typeof data['restaurantId'] === 'string' && data['restaurantId']
        ? data['restaurantId']
        : undefined;
    const restaurant = restaurantId
      ? (
          await db.collection(RESTAURANT_COLLECTION).doc(restaurantId).get()
        ).data()
      : undefined;

    return {
      scopeKey: biteScopeKey(target.biteId),
      subjectId: target.biteId,
      claimedLabels: labelsOf(data['dietaryLabels']),
      creatorUid:
        typeof data['userId'] === 'string' ? data['userId'] : undefined,
      restaurantId,
      restaurant,
    };
  }

  const restaurant = await db
    .collection(RESTAURANT_COLLECTION)
    .doc(target.restaurantId)
    .get();

  if (!restaurant.exists) {
    throw new HttpsError('not-found', 'Restaurant was not found.');
  }

  const menuId = restaurant.data()?.['menuId'];
  const menu =
    typeof menuId === 'string' && menuId
      ? (await db.collection(MENUS_COLLECTION).doc(menuId).get()).data()
      : undefined;
  const row = findMenuRow(menu, target.menuItemId);

  if (!row) {
    throw new HttpsError('not-found', 'That dish is not on the menu.');
  }

  return {
    scopeKey: menuScopeKey(target.restaurantId),
    subjectId: target.menuItemId,
    claimedLabels: labelsOf(row['dietaryLabels']),
    restaurantId: target.restaurantId,
    restaurant: restaurant.data(),
  };
};

/**
 * Who may vote (`R-5`, and `Dietary Choice Questions` in `Current State -
 * Open Questions` as settled for #2197): not the creator on their own Bite,
 * not an account holding the restaurant, and only an account at least
 * {@link DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS} days old with a Bite of its own.
 * The age and the Bite are the bar against throwaway accounts.
 */
const ineligibilityOf = async (
  uid: string,
  resolved: ResolvedTarget,
  now: Date,
): Promise<DietaryVoteIneligibleReason | undefined> => {
  if (resolved.creatorUid === uid) {
    return 'own-bite';
  }

  if (resolved.restaurant && isRestaurantOwner(resolved.restaurant, uid)) {
    return 'restaurant-holder';
  }

  const createdAt = Date.parse(
    (await getAuth().getUser(uid)).metadata.creationTime ?? '',
  );

  if (
    !Number.isFinite(createdAt) ||
    now.getTime() - createdAt < DIETARY_VOTE_MIN_ACCOUNT_AGE_DAYS * DAY_MS
  ) {
    return 'account-too-new';
  }

  const ownBites = await getFirestore()
    .collection(BITES_COLLECTION)
    .where('userId', '==', uid)
    .limit(1)
    .get();

  return ownBites.empty ? 'no-own-bite' : undefined;
};

/**
 * Confirms or disputes one dietary label on a Bite or on a menu item (GitHub
 * issue #2197). One vote per account per target and label; a second call
 * replaces the first, and the counts move with it.
 *
 * A callable rather than a client write, for three reasons: who may vote
 * needs the Bite, the restaurant, the account's age and its own Bites, which
 * no rule can read; the counts are written by the backend only (`R-5`); and
 * the optional note is free text, checked first like any other (`RD-UR-11`).
 *
 * An ineligible caller is answered, not thrown at, so the app can say why.
 * The log names the target and the label, never the voter.
 */
export const voteDietaryLabelHandler = async (
  request: CallableRequest<VoteDietaryLabelRequest>,
  now: Date = new Date(),
): Promise<VoteDietaryLabelResponse> => {
  requireMember(request, 'You must be signed in to vote on a label.');

  const uid = request.auth.uid;
  const data = request.data ?? {};
  const target = parseTarget(data.target);
  const label = parseLabel(data.label);
  const vote = parseVote(data.vote);
  const reason = parseReason(vote, data.reason);
  const note = parseNote(data.note);

  const resolved = await resolveTarget(target);

  if (!resolved.claimedLabels.includes(label)) {
    throw new HttpsError(
      'failed-precondition',
      'Nobody claims that label here.',
    );
  }

  const ineligible = await ineligibilityOf(uid, resolved, now);

  if (ineligible) {
    return { status: 'ineligible', reason: ineligible };
  }

  const db = getFirestore();

  if (note) {
    const verdict = await checkContent(db, [{ field: 'note', value: note }]);

    if (verdict.verdict === 'refused') {
      recordContentRefusal({
        uid,
        surface: 'dietaryVoteNote',
        stage: 'callable',
        targetId: `${resolved.scopeKey}/${resolved.subjectId}`,
        verdict,
        text: note,
      });

      return { status: 'refused', field: 'note' };
    }
  }

  const { scopeKey, subjectId } = resolved;
  const votesRef = db
    .collection(DIETARY_LABEL_VOTES_COLLECTION)
    .doc(ownVotesId(scopeKey, uid));
  const tallyRef = db
    .collection(DIETARY_LABEL_TALLIES_COLLECTION)
    .doc(scopeKey);

  const tally = await db.runTransaction(async (transaction) => {
    const [votesSnapshot, tallySnapshot] = [
      await transaction.get(votesRef),
      await transaction.get(tallyRef),
    ];
    const votes = scopeItemsOf<StoredDietaryVote>(votesSnapshot.data());
    const tallies = scopeItemsOf<unknown>(tallySnapshot.data());
    const before = votes[subjectId]?.[label]?.vote;
    const next = shiftTally(
      tallyOf(tallies[subjectId]?.[label]),
      isDietaryVote(before) ? before : undefined,
      vote,
    );
    const stored: StoredDietaryVote = {
      vote,
      ...(reason ? { reason } : {}),
      ...(note ? { note } : {}),
      votedAt: now.toISOString(),
    };

    transaction.set(votesRef, {
      uid,
      scopeKey,
      items: {
        ...votes,
        [subjectId]: { ...(votes[subjectId] ?? {}), [label]: stored },
      },
    });
    transaction.set(tallyRef, {
      scopeKey,
      ...(target.type === 'bite'
        ? { biteId: target.biteId }
        : { restaurantId: target.restaurantId }),
      items: {
        ...tallies,
        [subjectId]: { ...(tallies[subjectId] ?? {}), [label]: next },
      },
      updatedAt: now.toISOString(),
    });

    return next;
  });

  logger.info('voteDietaryLabel: vote recorded', {
    scopeKey,
    subjectId,
    label,
    vote,
  });

  return { status: 'saved', tally };
};

export const voteDietaryLabel = onAppCheck<
  VoteDietaryLabelRequest,
  Promise<VoteDietaryLabelResponse>
>({ timeoutSeconds: 30 }, (request) => voteDietaryLabelHandler(request));
