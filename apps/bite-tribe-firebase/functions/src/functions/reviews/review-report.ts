import { DocumentReference, Firestore } from 'firebase-admin/firestore';

/**
 * Where a report on a review or reply lives (GitHub issue #2117).
 *
 * ```text
 * /reviewReports/{reviewId}_{reporterUid}
 * ```
 *
 * Built the way `/biteReports` is (issue #1608): one document per account per
 * review, named by the pair, so a second report from the same account is a
 * `create` on a document that already exists and Firestore refuses it
 * atomically.
 *
 * Written only by `reportReview` and `dismissReviewReports`, read only by the
 * operator callables, both through the Admin SDK. `firestore.rules` lets an
 * operator read the collection and nobody write it.
 */
export const REVIEW_REPORTS_COLLECTION = 'reviewReports';

/**
 * Why a review or reply was reported.
 *
 * A fixed list for the same reason the Bite list is fixed: a reporter chooses
 * rather than writes. `hate` is here because review text is where it appears;
 * the Bite list's `notFood` has nothing to say about a sentence.
 *
 * Repeated in `libs/bite-tribe-common/model/src/lib/review-report.ts`, because
 * the Functions project cannot reach a library (see `shared/roles.ts`). The two
 * lists have to be changed together.
 */
export const REVIEW_REPORT_REASONS = [
  'harassment',
  'hate',
  'spam',
  'inappropriate',
  'other',
] as const;

export type ReviewReportReason = (typeof REVIEW_REPORT_REASONS)[number];

/** `open` until an operator acts on it; see `BiteReportStatus`. */
export type ReviewReportStatus = 'open' | 'dismissed';

export interface ReviewReport {
  reviewId: string;
  /** The Bite's id, without the `/bites/` prefix the review stores. */
  biteId: string;
  /** The top-level review of the thread; the review's own id for a review. */
  threadId: string;
  reviewAuthorId: string;
  reporterUid: string;
  reason: ReviewReportReason;
  status: ReviewReportStatus;
  createdAt: string;
  createdAtTimestamp: number;
  dismissedAt?: string;
  dismissedAtTimestamp?: number;
}

export const isReviewReportReason = (
  value: unknown,
): value is ReviewReportReason =>
  typeof value === 'string' &&
  (REVIEW_REPORT_REASONS as readonly string[]).includes(value);

export const reviewReportId = (reviewId: string, reporterUid: string): string =>
  `${reviewId}_${reporterUid}`;

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

const deleteRefs = async (
  db: Firestore,
  refs: DocumentReference[],
): Promise<void> => {
  for (let index = 0; index < refs.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();
    refs
      .slice(index, index + WRITE_BATCH_LIMIT)
      .forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
};

/**
 * Deletes every report filed against a review, open or dismissed.
 *
 * Once the review is gone there is nothing left to act on, and no reason to
 * keep the reporter's name next to it.
 */
export const deleteReviewReportsForReview = async (
  db: Firestore,
  reviewId: string,
): Promise<number> => {
  const reports = await db
    .collection(REVIEW_REPORTS_COLLECTION)
    .where('reviewId', '==', reviewId)
    .get();

  await deleteRefs(
    db,
    reports.docs.map((report) => report.ref),
  );

  return reports.size;
};

/**
 * Deletes the review reports an account filed and the ones filed against its
 * reviews, for the account-deletion cascade.
 *
 * Both directions, like `deleteUserReportsForUser`: a filed report carries the
 * reporter's uid in its name, and a report against the account carries its uid
 * in `reviewAuthorId`. A review the account wrote that holds up somebody
 * else's reply survives as a tombstone (issue #2116), so its reports would
 * otherwise outlive the account with the uid in them.
 */
export const deleteReviewReportsForAccount = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const [filed, against] = await Promise.all([
    db
      .collection(REVIEW_REPORTS_COLLECTION)
      .where('reporterUid', '==', uid)
      .get(),
    db
      .collection(REVIEW_REPORTS_COLLECTION)
      .where('reviewAuthorId', '==', uid)
      .get(),
  ]);
  const refs = new Map<string, DocumentReference>();

  [...filed.docs, ...against.docs].forEach((report) =>
    refs.set(report.ref.path, report.ref),
  );

  await deleteRefs(db, [...refs.values()]);

  return refs.size;
};
