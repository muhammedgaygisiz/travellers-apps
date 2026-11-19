import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { isTombstone } from './delete-review';
import {
  HiddenReview,
  hiddenReviewRef,
  hiddenUpdate,
  isHidden,
} from './hidden-review';
import {
  REVIEW_REPORT_REASONS,
  REVIEW_REPORTS_COLLECTION,
  ReviewReportReason,
  isReviewReportReason,
} from './review-report';

const BITES_COLLECTION = 'bites';
const REVIEWS_COLLECTION = 'reviews';
const USERS_COLLECTION = 'users';

/** The most open reports one listing reads; see `listBiteReports`. */
export const MAX_OPEN_REVIEW_REPORTS = 500;

/** The same limit the Bite dismissal puts on its reason, for the same log. */
const MAX_REASON_LENGTH = 500;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

/** The item a reply answers, shown so an operator reads the reply in context. */
export interface ReportedReviewParent {
  reviewId: string;
  /** Empty for a tombstone or a parent that is gone. */
  text: string;
  authorDisplayName: string;
}

/**
 * One reported review or reply, with what an operator needs to judge it.
 *
 * Aggregated per review like `ReportedBite`, and **who reported it is not
 * returned**.
 */
export interface ReportedReview {
  reviewId: string;
  /** False when the review was deleted or withdrawn and only its reports remain. */
  exists: boolean;
  text: string;
  /** Empty for a review whose author deleted their account. */
  authorUid: string;
  authorDisplayName: string;
  biteId: string;
  biteName: string;
  /** Absent for a top-level review. */
  parent?: ReportedReviewParent;
  reportCount: number;
  reasons: Record<ReviewReportReason, number>;
  firstReportedAt: string;
  lastReportedAt: string;
}

export interface ListReviewReportsResult {
  reviews: ReportedReview[];
  /** True when there were more open reports than one listing reads. */
  truncated: boolean;
}

const stringOf = (value: unknown): string =>
  typeof value === 'string' ? value : '';

const biteIdOf = (value: unknown): string =>
  stringOf(value).split('/').pop() ?? '';

const emptyReasons = (): Record<ReviewReportReason, number> =>
  Object.fromEntries(
    REVIEW_REPORT_REASONS.map((reason) => [reason, 0]),
  ) as Record<ReviewReportReason, number>;

const readAll = async (
  db: FirebaseFirestore.Firestore,
  collection: string,
  ids: string[],
): Promise<Map<string, DocumentData>> => {
  const found = new Map<string, DocumentData>();

  if (ids.length === 0) {
    return found;
  }

  const snapshots = await db.getAll(
    ...ids.map((id) => db.collection(collection).doc(id)),
  );

  snapshots.forEach((snapshot) => {
    if (snapshot.exists) {
      found.set(snapshot.id, snapshot.data() ?? {});
    }
  });

  return found;
};

/**
 * Lists every review or reply with an open report (GitHub issue #2117).
 *
 * A callable for the reason `listBiteReports` is one: the answer joins the
 * reports to the reviews, their parents, their Bites and their authors' names.
 *
 * **Newest report first.** A thread is a conversation, and abuse in one is
 * most worth acting on while the conversation is still going.
 */
export const listReviewReportsHandler = async (
  request: CallableRequest<unknown>,
): Promise<ListReviewReportsResult> => {
  requireAdmin(request);

  const db = getFirestore();
  const reports = await db
    .collection(REVIEW_REPORTS_COLLECTION)
    .where('status', '==', 'open')
    .limit(MAX_OPEN_REVIEW_REPORTS + 1)
    .get();

  const truncated = reports.size > MAX_OPEN_REVIEW_REPORTS;
  const byReview = new Map<
    string,
    {
      reasons: Record<ReviewReportReason, number>;
      dates: string[];
      biteId: string;
    }
  >();

  reports.docs.slice(0, MAX_OPEN_REVIEW_REPORTS).forEach((doc) => {
    const report = doc.data();
    const reviewId = stringOf(report['reviewId']);

    if (!reviewId) {
      return;
    }

    const entry = byReview.get(reviewId) ?? {
      reasons: emptyReasons(),
      dates: [],
      biteId: stringOf(report['biteId']),
    };
    const reason = report['reason'];

    entry.reasons[isReviewReportReason(reason) ? reason : 'other'] += 1;
    entry.dates.push(stringOf(report['createdAt']));
    byReview.set(reviewId, entry);
  });

  const reviewIds = [...byReview.keys()];

  if (reviewIds.length === 0) {
    return { reviews: [], truncated };
  }

  const reviews = await readAll(db, REVIEWS_COLLECTION, reviewIds);
  const parentIds = [
    ...new Set(
      [...reviews.values()]
        .map((review) => stringOf(review['parentReviewId']))
        .filter(Boolean),
    ),
  ];
  const parents = await readAll(db, REVIEWS_COLLECTION, parentIds);
  const biteIds = [
    ...new Set(
      reviewIds
        .map(
          (id) =>
            biteIdOf(reviews.get(id)?.['biteId']) || byReview.get(id)?.biteId,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const bites = await readAll(db, BITES_COLLECTION, biteIds);
  const authorUids = [
    ...new Set(
      [...reviews.values(), ...parents.values()]
        .map((review) => stringOf(review['authorId']))
        .filter(Boolean),
    ),
  ];
  const authors = await readAll(db, USERS_COLLECTION, authorUids);

  /**
   * The current profile name, falling back to the copy on the review: the
   * copy is what the thread shows, and an account without a profile document
   * still has one.
   */
  const nameOf = (review: DocumentData | undefined): string => {
    const uid = stringOf(review?.['authorId']);

    return (
      stringOf(authors.get(uid)?.['displayName']) ||
      stringOf(review?.['author'])
    );
  };

  const result = reviewIds.map((reviewId): ReportedReview => {
    const {
      reasons,
      dates,
      biteId: reportedBiteId,
    } = byReview.get(reviewId) ?? {
      reasons: emptyReasons(),
      dates: [],
      biteId: '',
    };
    const review = reviews.get(reviewId);
    // A hidden item has no text left on the public document to judge.
    const live =
      review !== undefined && !isTombstone(review) && !isHidden(review);
    const biteId = biteIdOf(review?.['biteId']) || reportedBiteId;
    const parentId = stringOf(review?.['parentReviewId']);
    const parent = parentId ? parents.get(parentId) : undefined;
    const sortedDates = [...dates].sort();

    return {
      reviewId,
      exists: live,
      text: live ? stringOf(review['review']) : '',
      authorUid: live ? stringOf(review['authorId']) : '',
      authorDisplayName: live ? nameOf(review) : '',
      biteId,
      biteName: stringOf(bites.get(biteId)?.['name']),
      ...(parentId
        ? {
            parent: {
              reviewId: parentId,
              text:
                parent && !isTombstone(parent) && !isHidden(parent)
                  ? stringOf(parent['review'])
                  : '',
              authorDisplayName:
                parent && !isTombstone(parent) && !isHidden(parent)
                  ? nameOf(parent)
                  : '',
            },
          }
        : {}),
      reportCount: dates.length,
      reasons,
      firstReportedAt: sortedDates[0] ?? '',
      lastReportedAt: sortedDates[sortedDates.length - 1] ?? '',
    };
  });

  result.sort((a, b) => b.lastReportedAt.localeCompare(a.lastReportedAt));

  return { reviews: result, truncated };
};

export const listReviewReports = onAppCheck(listReviewReportsHandler);

interface DismissReviewReportsRequest {
  reviewId?: unknown;
  reason?: unknown;
}

export interface DismissReviewReportsResult {
  reviewId: string;
  dismissedReports: number;
}

const parseReviewId = (value: unknown): string => {
  const reviewId = typeof value === 'string' ? value.trim() : '';

  if (!reviewId) {
    throw new HttpsError('invalid-argument', 'reviewId is required.');
  }

  return reviewId;
};

/** Required: the log entry is the only record of why the review stays. */
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
 * Closes the open reports on a review and keeps it up (GitHub issue #2117).
 *
 * The **Keep** answer in the queue, beside blocking the author with
 * `setUserBlocked`. The reports are kept as `dismissed`, so the accounts that
 * filed them cannot file the same report again.
 */
export const dismissReviewReportsHandler = async (
  request: CallableRequest<DismissReviewReportsRequest>,
): Promise<DismissReviewReportsResult> => {
  requireAdmin(request);
  const reviewId = parseReviewId(request.data?.reviewId);
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const reports = await db
    .collection(REVIEW_REPORTS_COLLECTION)
    .where('reviewId', '==', reviewId)
    .get();
  const open = reports.docs.filter((doc) => doc.data()['status'] === 'open');

  if (open.length === 0) {
    throw new HttpsError(
      'not-found',
      `No open reports found for review ${reviewId}.`,
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
    action: 'dismissReviewReports',
    targetType: 'review',
    targetId: reviewId,
    outcome: 'succeeded',
    reason,
    details: { dismissedReports: open.length },
  });

  return { reviewId, dismissedReports: open.length };
};

export const dismissReviewReports = onAppCheck<DismissReviewReportsRequest>(
  dismissReviewReportsHandler,
);

interface HideReviewAsOperatorRequest {
  reviewId?: unknown;
  reason?: unknown;
}

export interface HideReviewAsOperatorResult {
  reviewId: string;
  dismissedReports: number;
}

/**
 * Takes a review or reply out of its thread and keeps its text (GitHub issue
 * #2118).
 *
 * The **Hide** answer in the queue, beside Keep and Block author. Neither of
 * those removes the text, and a delete would take the replies under it down
 * with it. So in one transaction this:
 *
 * - copies the text and the author's name to `/hiddenReviews/{reviewId}`, with
 *   the operator, the reason and the time;
 * - removes them from the public document and sets `hiddenAt`, leaving
 *   everything that places it, so the item keeps its place in the thread;
 * - dismisses the open reports on it, which leaves the queue.
 *
 * The reason is required for the reason it is on `deleteBiteAsOperator`: the
 * log entry is the only record of why.
 */
export const hideReviewAsOperatorHandler = async (
  request: CallableRequest<HideReviewAsOperatorRequest>,
): Promise<HideReviewAsOperatorResult> => {
  requireAdmin(request);
  const reviewId = parseReviewId(request.data?.reviewId);
  const reason = parseReason(request.data?.reason);
  const operatorUid = request.auth?.uid ?? '';

  const db = getFirestore();
  const reference = db.collection(REVIEWS_COLLECTION).doc(reviewId);

  const dismissedReports = await db.runTransaction(async (transaction) => {
    const stored = await transaction.get(reference);

    if (!stored.exists) {
      throw new HttpsError('not-found', `No review found for ${reviewId}.`);
    }

    const data = stored.data() ?? {};

    if (isTombstone(data)) {
      throw new HttpsError(
        'failed-precondition',
        'A deleted review cannot be hidden.',
      );
    }

    if (isHidden(data)) {
      throw new HttpsError(
        'failed-precondition',
        'This review is already hidden.',
      );
    }

    const reports = await transaction.get(
      db
        .collection(REVIEW_REPORTS_COLLECTION)
        .where('reviewId', '==', reviewId),
    );
    const open = reports.docs.filter((doc) => doc.data()['status'] === 'open');

    if (open.length > WRITE_BATCH_LIMIT) {
      // A transaction holds 500 writes. No review has had this many accounts
      // report it; failing loudly is better than half a hide.
      throw new HttpsError(
        'resource-exhausted',
        `Review ${reviewId} has too many open reports to hide in one step.`,
      );
    }

    const now = new Date();
    const parentReviewId = stringOf(data['parentReviewId']);
    const createdAt = stringOf(data['createdAt']);
    const updatedAt = stringOf(data['updatedAt']);
    const copy: HiddenReview = {
      reviewId,
      review: stringOf(data['review']),
      author: stringOf(data['author']),
      authorId: stringOf(data['authorId']),
      biteId: stringOf(data['biteId']),
      threadId: stringOf(data['threadId']) || reviewId,
      ...(parentReviewId ? { parentReviewId } : {}),
      ...(createdAt ? { createdAt } : {}),
      ...(updatedAt ? { updatedAt } : {}),
      hiddenBy: operatorUid,
      reason,
      hiddenAt: now.toISOString(),
      hiddenAtTimestamp: now.getTime(),
    };

    transaction.set(hiddenReviewRef(db, reviewId), copy);
    transaction.update(reference, hiddenUpdate(now));
    open.forEach((doc) =>
      transaction.update(doc.ref, {
        status: 'dismissed',
        dismissedAt: now.toISOString(),
        dismissedAtTimestamp: now.getTime(),
      }),
    );

    return open.length;
  });

  logOperatorAction(request, {
    action: 'hideReviewAsOperator',
    targetType: 'review',
    targetId: reviewId,
    outcome: 'succeeded',
    reason,
    details: { dismissedReports },
  });

  return { reviewId, dismissedReports };
};

export const hideReviewAsOperator = onAppCheck<HideReviewAsOperatorRequest>(
  hideReviewAsOperatorHandler,
);
