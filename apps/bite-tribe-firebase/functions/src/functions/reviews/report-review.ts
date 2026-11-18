import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { isTombstone } from './delete-review';
import {
  REVIEW_REPORTS_COLLECTION,
  ReviewReport,
  ReviewReportReason,
  isReviewReportReason,
  reviewReportId,
} from './review-report';

const REVIEWS_COLLECTION = 'reviews';

/** Firestore's `ALREADY_EXISTS`, as the Admin SDK reports a failed `create`. */
const ALREADY_EXISTS = 6;

interface ReportReviewRequest {
  reviewId?: unknown;
  reason?: unknown;
}

export interface ReportReviewResult {
  /** False when this account had already reported the review; see `reportBite`. */
  reported: boolean;
}

const parseReviewId = (value: unknown): string => {
  const reviewId = typeof value === 'string' ? value.trim() : '';

  if (!reviewId || reviewId.includes('/')) {
    throw new HttpsError('invalid-argument', 'reviewId is required.');
  }

  return reviewId;
};

const parseReason = (value: unknown): ReviewReportReason => {
  if (!isReviewReportReason(value)) {
    throw new HttpsError('invalid-argument', 'reason is not a known reason.');
  }

  return value;
};

const isAlreadyExists = (error: unknown): boolean =>
  (error as { code?: unknown })?.code === ALREADY_EXISTS ||
  (error as { code?: unknown })?.code === 'already-exists';

/** A review stores its Bite as `/bites/{id}`; the report keeps the bare id. */
const biteIdOf = (value: unknown): string =>
  typeof value === 'string' ? (value.split('/').pop() ?? '') : '';

/**
 * Reports a review or reply to the BiteTribe operators (GitHub issue #2117).
 *
 * A callable for the reasons `reportBite` is one: the duplicate check is a
 * `create` that fails on an existing document, and whether the caller wrote
 * the review is a read a rule would repeat on every evaluation.
 *
 * **Silent.** Nothing here writes to the review, notifies anybody or leaves a
 * trace its author can read. In a thread of three people a notified author
 * would know who reported them. The log line names the review and the reason
 * and not the reporter.
 */
export const reportReviewHandler = async (
  request: CallableRequest<ReportReviewRequest>,
): Promise<ReportReviewResult> => {
  requireMember(request, 'You must be signed in to report a review.');

  const reporterUid = request.auth.uid;
  const reviewId = parseReviewId(request.data?.reviewId);
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const review = await db.collection(REVIEWS_COLLECTION).doc(reviewId).get();

  if (!review.exists) {
    throw new HttpsError('not-found', `No review found for ${reviewId}.`);
  }

  const data = review.data() ?? {};

  // A tombstone (issue #2116) has no text left to object to.
  if (isTombstone(data)) {
    throw new HttpsError(
      'failed-precondition',
      'A deleted review cannot be reported.',
    );
  }

  if (data['authorId'] === reporterUid) {
    throw new HttpsError(
      'failed-precondition',
      'You cannot report your own review.',
    );
  }

  const now = new Date();
  const report: ReviewReport = {
    reviewId,
    biteId: biteIdOf(data['biteId']),
    threadId:
      typeof data['threadId'] === 'string' ? data['threadId'] : reviewId,
    reviewAuthorId:
      typeof data['authorId'] === 'string' ? data['authorId'] : '',
    reporterUid,
    reason,
    status: 'open',
    createdAt: now.toISOString(),
    createdAtTimestamp: now.getTime(),
  };

  try {
    await db
      .collection(REVIEW_REPORTS_COLLECTION)
      .doc(reviewReportId(reviewId, reporterUid))
      .create(report);
  } catch (error) {
    if (isAlreadyExists(error)) {
      return { reported: false };
    }

    throw error;
  }

  logger.info('reportReview: review reported', { reviewId, reason });

  return { reported: true };
};

export const reportReview =
  onAppCheck<ReportReviewRequest>(reportReviewHandler);
