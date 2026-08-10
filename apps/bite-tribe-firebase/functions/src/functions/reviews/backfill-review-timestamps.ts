import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';

const REVIEWS_COLLECTION = 'reviews';
const WRITE_BATCH_LIMIT = 500;

export interface BackfillReviewTimestampsResult {
  /** Every review document the migration looked at. */
  processed: number;
  /** Documents that gained a `createdAtTimestamp`. */
  filled: number;
  /** Documents that already had a usable one. */
  skipped: number;
  /** Documents with no `createdAt` this could be derived from. */
  unresolvable: number;
}

/**
 * The numeric timestamp a review already carries, if it carries a usable one.
 *
 * `createdAtTimestamp` was added after reviews shipped, so documents written
 * before it have only the ISO `createdAt`. A field that is present but not a
 * finite number is treated as missing rather than trusted.
 */
const storedTimestamp = (review: DocumentData): number | undefined => {
  const stored = review['createdAtTimestamp'];

  return typeof stored === 'number' && Number.isFinite(stored)
    ? stored
    : undefined;
};

/** The same instant read off the ISO string, when it can be read at all. */
const derivedTimestamp = (review: DocumentData): number | undefined => {
  const createdAt = review['createdAt'];

  if (typeof createdAt !== 'string') {
    return undefined;
  }

  const parsed = Date.parse(createdAt);

  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * One-off migration that gives every review the numeric `createdAtTimestamp`
 * the threaded compartment sorts by (issue #1283).
 *
 * Reviews written before that field existed carry only `createdAt`, and the two
 * are the same instant in two shapes, so the value is derived rather than
 * invented — a backfilled review keeps its real place in its thread instead of
 * being pushed to one end of it.
 *
 * Idempotent: a document that already has a usable timestamp is left untouched,
 * so this can be run again without moving anything. A document with no readable
 * `createdAt` is counted and skipped rather than given a made-up time; the
 * client sort tolerates it, which is why this does not have to guess.
 */
export const backfillReviewTimestamps =
  async (): Promise<BackfillReviewTimestampsResult> => {
    const db = getFirestore();
    const reviewsSnapshot = await db.collection(REVIEWS_COLLECTION).get();

    let batch = db.batch();
    let batchSize = 0;
    let filled = 0;
    let skipped = 0;
    let unresolvable = 0;

    for (const reviewDoc of reviewsSnapshot.docs) {
      const review = reviewDoc.data();

      if (storedTimestamp(review) !== undefined) {
        skipped++;
        continue;
      }

      const derived = derivedTimestamp(review);

      if (derived === undefined) {
        logger.warn('backfillReviewTimestamps: no readable createdAt', {
          reviewId: reviewDoc.id,
        });
        unresolvable++;
        continue;
      }

      batch.update(reviewDoc.ref, { createdAtTimestamp: derived });
      batchSize++;
      filled++;

      if (batchSize === WRITE_BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    const result: BackfillReviewTimestampsResult = {
      processed: reviewsSnapshot.size,
      filled,
      skipped,
      unresolvable,
    };

    logger.info('backfillReviewTimestamps: complete', result);

    return result;
  };

export const backfillReviewTimestampsHandler = async (
  request: CallableRequest<void>,
): Promise<BackfillReviewTimestampsResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to run the review timestamp backfill.',
    );
  }

  logger.info('backfillReviewTimestamps: started', {
    requestedBy: request.auth.uid,
  });

  return backfillReviewTimestamps();
};

export const backfillReviewTimestampsCallable = onAppCheck<void>(
  backfillReviewTimestampsHandler,
);
