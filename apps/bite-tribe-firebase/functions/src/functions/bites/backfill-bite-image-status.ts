import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { storagePathFromDownloadUrl } from './delete-bite-as-operator';

const BITES_COLLECTION = 'bites';
const WRITE_BATCH_LIMIT = 500;

/**
 * How many Bites have their Storage checked at once. Each check is one listing
 * and at most one metadata read, so this bounds concurrent Storage calls rather
 * than Firestore work.
 */
const STORAGE_CHECK_CONCURRENCY = 50;

export interface BackfillBiteImageStatusResult {
  /** Every Bite the migration looked at. */
  inspected: number;
  /** Bites without a status that were found to have a photo in Storage. */
  uploaded: number;
  /** Bites without a status that have no photo anywhere in Storage. */
  failed: number;
  /** Bites that already carried a status and were left alone. */
  skipped: number;
}

/**
 * Whether any photo of this Bite exists in Storage.
 *
 * The `images/bites/{biteId}/` prefix is listed rather than `imagePath` being
 * trusted, because an edited Bite leaves a previous object under the same
 * prefix with a fresh UUID, and a download URL can outlive its object. The
 * named path is checked as well, for a photo migrated into place from outside
 * the prefix.
 */
export const hasStoredImage = async (
  biteId: string,
  bite: DocumentData,
): Promise<boolean> => {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles({
    prefix: `images/${BITES_COLLECTION}/${biteId}/`,
    maxResults: 1,
  });

  if (files.length > 0) {
    return true;
  }

  const namedPath = storagePathFromDownloadUrl(bite['imagePath']);

  if (!namedPath) {
    return false;
  }

  const [exists] = await bucket.file(namedPath).exists();

  return exists;
};

/**
 * Gives every Bite written before GitHub issue #1168 the `imageStatus` the
 * listing rule reads (issue #1717).
 *
 * The rule offers a Bite to other people only once its status is `uploaded`,
 * and Bites older than the upload-state work have no status at all - so until
 * this has run, turning the rule on hides every one of them. It must run
 * before the filter ships.
 *
 * `uploaded` where Storage holds a photo for the Bite, `failed` where it holds
 * none. `failed` rather than leaving the field absent, because that is what
 * the retry and the poster's notice already understand.
 *
 * Idempotent, like every collection migration on the admin surface: a Bite
 * that already has any status is never touched, so a second press writes
 * nothing. Only `imageStatus` is written - not `updatedAt`, which would tell
 * every reader the Bite was edited on the day an operator pressed a button.
 */
export const backfillBiteImageStatus =
  async (): Promise<BackfillBiteImageStatusResult> => {
    const db = getFirestore();
    const bitesSnapshot = await db.collection(BITES_COLLECTION).get();

    const unmarked = bitesSnapshot.docs.filter(
      (doc) => typeof doc.data()['imageStatus'] !== 'string',
    );

    let batch = db.batch();
    let batchSize = 0;
    let uploaded = 0;
    let failed = 0;

    for (let i = 0; i < unmarked.length; i += STORAGE_CHECK_CONCURRENCY) {
      const chunk = unmarked.slice(i, i + STORAGE_CHECK_CONCURRENCY);
      const found = await Promise.all(
        chunk.map((doc) => hasStoredImage(doc.id, doc.data())),
      );

      for (const [index, doc] of chunk.entries()) {
        const imageStatus = found[index] ? 'uploaded' : 'failed';

        batch.update(doc.ref, { imageStatus });
        batchSize++;

        if (imageStatus === 'uploaded') {
          uploaded++;
        } else {
          failed++;
        }

        if (batchSize === WRITE_BATCH_LIMIT) {
          await batch.commit();
          batch = db.batch();
          batchSize = 0;
        }
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    const result: BackfillBiteImageStatusResult = {
      inspected: bitesSnapshot.size,
      uploaded,
      failed,
      skipped: bitesSnapshot.size - unmarked.length,
    };

    logger.info('backfillBiteImageStatus: complete', result);

    return result;
  };

/**
 * Runs the Bite image status migration.
 *
 * Operator-only: it writes to every Bite that lacks a status, whoever posted
 * it, and the only surface that offers it is the admin migrations area.
 */
export const backfillBiteImageStatusHandler = async (
  request: CallableRequest<void>,
): Promise<BackfillBiteImageStatusResult> => {
  requireAdmin(request);

  // No `targetId`: the migration walks the whole collection, so the record of
  // what it touched is the counts it returns.
  logOperatorAction(request, {
    action: 'backfillBiteImageStatus',
    targetType: 'bite',
    outcome: 'started',
  });

  const result = await backfillBiteImageStatus();

  logOperatorAction(request, {
    action: 'backfillBiteImageStatus',
    targetType: 'bite',
    outcome: 'succeeded',
    details: { ...result },
  });

  return result;
};

export const backfillBiteImageStatusCallable = onAppCheck<void>(
  backfillBiteImageStatusHandler,
);
