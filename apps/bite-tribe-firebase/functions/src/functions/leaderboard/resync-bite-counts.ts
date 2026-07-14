import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';

const USERS_COLLECTION = 'users';
const BITES_COLLECTION = 'bites';
const WRITE_BATCH_LIMIT = 500;

const ZURICH_TZ = 'Europe/Zurich';

const db = admin.firestore();

/**
 * Reads the biteCount currently stored on a user document, defaulting to 0
 * when the field is missing or not a number.
 */
export const getStoredBiteCount = (
  user: admin.firestore.DocumentData,
): number => (typeof user['biteCount'] === 'number' ? user['biteCount'] : 0);

/**
 * Counts the bites actually owned by the given user in the bites collection.
 */
const getActualBiteCount = async (userId: string): Promise<number> => {
  const countSnap = await db
    .collection(BITES_COLLECTION)
    .where('userId', '==', userId)
    .count()
    .get();

  return countSnap.data().count;
};

/**
 * Scheduled Cloud Function that runs every Monday at 03:00 Europe/Zurich.
 *
 * The aggregate `biteCount` stored on a user can drift from the real number of
 * bites (e.g. after failed create/delete triggers). This function processes
 * every user, counts their bites, and rewrites `biteCount` whenever it differs
 * from the actual count, keeping the aggregate aligned.
 */
export const resyncBiteCounts = onSchedule(
  {
    schedule: '0 3 * * 1',
    timeZone: ZURICH_TZ,
  },
  async (): Promise<void> => {
    logger.info('resyncBiteCounts: starting weekly biteCount resync');

    const usersSnapshot = await db.collection(USERS_COLLECTION).get();

    let batch = db.batch();
    let batchSize = 0;
    let updatedUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      const actualBiteCount = await getActualBiteCount(userDoc.id);
      const storedBiteCount = getStoredBiteCount(userDoc.data());

      if (actualBiteCount === storedBiteCount) {
        continue;
      }

      logger.info('resyncBiteCounts: correcting biteCount', {
        userId: userDoc.id,
        storedBiteCount,
        actualBiteCount,
      });

      batch.update(userDoc.ref, {
        biteCount: actualBiteCount,
        updatedAt: FieldValue.serverTimestamp(),
      });
      batchSize++;
      updatedUsers++;

      if (batchSize === WRITE_BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        batchSize = 0;
      }
    }

    if (batchSize > 0) {
      await batch.commit();
    }

    logger.info('resyncBiteCounts: weekly biteCount resync complete', {
      totalUsers: usersSnapshot.size,
      updatedUsers,
    });
  },
);
