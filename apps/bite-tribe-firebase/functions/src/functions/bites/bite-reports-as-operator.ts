import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  BITE_REPORT_REASONS,
  BITE_REPORTS_COLLECTION,
  BiteReportReason,
  isBiteReportReason,
} from './bite-report';

const BITES_COLLECTION = 'bites';
const USERS_COLLECTION = 'users';

/**
 * The most open reports one listing reads.
 *
 * A queue this long is a queue nobody is working, and the listing says when it
 * was cut rather than presenting the first page as the whole.
 */
export const MAX_OPEN_REPORTS = 500;

/** The same limit `deleteBiteAsOperator` puts on its reason, for the same log. */
const MAX_REASON_LENGTH = 500;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

/**
 * One reported Bite, with what an operator needs to judge it.
 *
 * The reports are aggregated rather than listed: an operator decides about a
 * Bite, not about each report, and the count and the reasons are what weigh.
 * **Who reported it is not returned.** An operator has no use for it in this
 * decision, and the less the screen shows the less there is to leak.
 */
export interface ReportedBite {
  biteId: string;
  /** False when the Bite was deleted and its reports were not yet cleared. */
  exists: boolean;
  name: string;
  place: string;
  description: string;
  tags: string[];
  /** The download URL, or the pending base64 copy - whichever the Bite holds. */
  imageSrc: string;
  /** Empty for a Bite whose author deleted their account. */
  authorUid: string;
  authorDisplayName: string;
  reportCount: number;
  reasons: Record<BiteReportReason, number>;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface ListBiteReportsResult {
  bites: ReportedBite[];
  /** True when there were more open reports than one listing reads. */
  truncated: boolean;
}

const stringOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const emptyReasons = (): Record<BiteReportReason, number> =>
  Object.fromEntries(
    BITE_REPORT_REASONS.map((reason) => [reason, 0]),
  ) as Record<BiteReportReason, number>;

/**
 * Lists every Bite with an open report (GitHub issue #1608).
 *
 * Through a callable rather than a read in the admin app, because the answer is
 * a join: the reports name a Bite, the Bite names an author, and the author's
 * display name lives on a third document. Done here it is two batched reads;
 * done in the client it is a read per row.
 *
 * Most-reported first, then oldest first, so the Bite most people objected to
 * is at the top and an old report is not buried by a busy day.
 */
export const listBiteReportsHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListBiteReportsResult> => {
  requireAdmin(request);

  const db = getFirestore();
  const reports = await db
    .collection(BITE_REPORTS_COLLECTION)
    .where('status', '==', 'open')
    .limit(MAX_OPEN_REPORTS + 1)
    .get();

  const truncated = reports.size > MAX_OPEN_REPORTS;
  const byBite = new Map<
    string,
    { reasons: Record<BiteReportReason, number>; dates: string[] }
  >();

  reports.docs.slice(0, MAX_OPEN_REPORTS).forEach((doc) => {
    const report = doc.data();
    const biteId = stringOf(report['biteId']);

    if (!biteId) {
      return;
    }

    const entry = byBite.get(biteId) ?? { reasons: emptyReasons(), dates: [] };
    const reason = report['reason'];

    entry.reasons[isBiteReportReason(reason) ? reason : 'other'] += 1;
    entry.dates.push(stringOf(report['createdAt']));
    byBite.set(biteId, entry);
  });

  const biteIds = [...byBite.keys()];

  if (biteIds.length === 0) {
    return { bites: [], truncated };
  }

  const biteSnapshots = await db.getAll(
    ...biteIds.map((id) => db.collection(BITES_COLLECTION).doc(id)),
  );
  const bites = new Map<string, DocumentData>();

  biteSnapshots.forEach((snapshot) => {
    if (snapshot.exists) {
      bites.set(snapshot.id, snapshot.data() ?? {});
    }
  });

  const authorUids = [
    ...new Set(
      [...bites.values()]
        .map((bite) => stringOf(bite['userId']))
        .filter(Boolean),
    ),
  ];
  const authorNames = new Map<string, string>();

  if (authorUids.length > 0) {
    const authors = await db.getAll(
      ...authorUids.map((uid) => db.collection(USERS_COLLECTION).doc(uid)),
    );

    authors.forEach((author) => {
      authorNames.set(author.id, stringOf(author.data()?.['displayName']));
    });
  }

  const result = biteIds.map((biteId): ReportedBite => {
    const { reasons, dates } = byBite.get(biteId) ?? {
      reasons: emptyReasons(),
      dates: [],
    };
    const bite = bites.get(biteId);
    const authorUid = stringOf(bite?.['userId']);
    const sortedDates = [...dates].sort();

    return {
      biteId,
      exists: bite !== undefined,
      name: stringOf(bite?.['name']),
      place: stringOf(bite?.['place']),
      description: stringOf(bite?.['description']),
      tags: Array.isArray(bite?.['tags'])
        ? (bite['tags'] as unknown[]).filter(
            (tag): tag is string => typeof tag === 'string',
          )
        : [],
      imageSrc: stringOf(bite?.['imagePath']) || stringOf(bite?.['image']),
      authorUid,
      authorDisplayName: authorNames.get(authorUid) ?? '',
      reportCount: dates.length,
      reasons,
      firstReportedAt: sortedDates[0] ?? '',
      lastReportedAt: sortedDates[sortedDates.length - 1] ?? '',
    };
  });

  result.sort(
    (a, b) =>
      b.reportCount - a.reportCount ||
      a.firstReportedAt.localeCompare(b.firstReportedAt),
  );

  return { bites: result, truncated };
};

export const listBiteReports = onAppCheck(listBiteReportsHandler);

interface DismissBiteReportsRequest {
  biteId?: unknown;
  reason?: unknown;
}

export interface DismissBiteReportsResult {
  biteId: string;
  dismissedReports: number;
}

const parseBiteId = (value: unknown): string => {
  const biteId = typeof value === 'string' ? value.trim() : '';

  if (!biteId) {
    throw new HttpsError('invalid-argument', 'biteId is required.');
  }

  return biteId;
};

/**
 * Required, like the reason on a deletion: a dismissal is the decision that a
 * reported Bite stays up, and the log entry is the only record of why.
 */
const parseReason = (value: unknown): string => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (!reason) {
    throw new HttpsError('invalid-argument', 'reason is required.');
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `reason must be at most ${MAX_REASON_LENGTH} characters.`,
    );
  }

  return reason;
};

/**
 * Closes the open reports on a Bite without removing it (GitHub issue #1608).
 *
 * The third answer to a report, beside deleting the Bite (`deleteBiteAsOperator`)
 * and blocking its author (`setUserBlocked`): the operator looked and the Bite
 * stays. The reports are kept as `dismissed` rather than deleted, so the
 * accounts that filed them cannot file the same report again and put the Bite
 * straight back in the queue.
 */
export const dismissBiteReportsHandler = async (
  request: CallableRequest<DismissBiteReportsRequest>,
): Promise<DismissBiteReportsResult> => {
  requireAdmin(request);
  const biteId = parseBiteId(request.data?.biteId);
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const reports = await db
    .collection(BITE_REPORTS_COLLECTION)
    .where('biteId', '==', biteId)
    .get();
  const open = reports.docs.filter((doc) => doc.data()['status'] === 'open');

  if (open.length === 0) {
    throw new HttpsError(
      'not-found',
      `No open reports found for Bite ${biteId}.`,
    );
  }

  const now = new Date();

  for (let index = 0; index < open.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();

    open.slice(index, index + WRITE_BATCH_LIMIT).forEach((doc) =>
      batch.update(doc.ref, {
        status: 'dismissed',
        dismissedAt: now.toISOString(),
        dismissedAtTimestamp: now.getTime(),
      }),
    );
    await batch.commit();
  }

  logOperatorAction(request, {
    action: 'dismissBiteReports',
    targetType: 'bite',
    targetId: biteId,
    outcome: 'succeeded',
    reason,
    details: { dismissedReports: open.length },
  });

  return { biteId, dismissedReports: open.length };
};

export const dismissBiteReports = onAppCheck<DismissBiteReportsRequest>(
  dismissBiteReportsHandler,
);
