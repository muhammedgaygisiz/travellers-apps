import {
  DocumentData,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';

type FollowCountField = 'followersCount' | 'followingCount';

const USERS_COLLECTION = 'users';
const WRITE_BATCH_LIMIT = 500;

const ZURICH_TZ = 'Europe/Zurich';

const SUBCOLLECTION_FOR_FIELD: Record<FollowCountField, string> = {
  followersCount: 'followers',
  followingCount: 'following',
};

const db = getFirestore();

/**
 * Reads a follow counter currently stored on a user document, defaulting to 0
 * when the field is missing or not a number.
 */
export const getStoredFollowCount = (
  user: DocumentData,
  field: FollowCountField,
): number => (typeof user[field] === 'number' ? user[field] : 0);

/**
 * Counts the actual documents in a user's followers/following subcollection.
 */
const getActualFollowCount = async (
  userId: string,
  field: FollowCountField,
): Promise<number> => {
  const countSnap = await db
    .collection(
      `${USERS_COLLECTION}/${userId}/${SUBCOLLECTION_FOR_FIELD[field]}`,
    )
    .count()
    .get();

  return countSnap.data().count;
};

/**
 * Scheduled Cloud Function that runs every Monday at 04:00 Europe/Zurich.
 *
 * `followersCount` and `followingCount` are aggregates maintained by the follow
 * write triggers, but they can be missing on user documents that predate the
 * aggregates or drift after a failed trigger. This function processes every
 * user, counts their real followers/following, and rewrites either aggregate
 * whenever it differs — backfilling existing users and correcting drift. It
 * mirrors `resyncBiteCounts`.
 */
export const resyncFollowCounts = onSchedule(
  {
    schedule: '0 4 * * 1',
    timeZone: ZURICH_TZ,
  },
  async (): Promise<void> => {
    logger.info('resyncFollowCounts: starting weekly follow-count resync');

    const usersSnapshot = await db.collection(USERS_COLLECTION).get();

    let batch = db.batch();
    let batchSize = 0;
    let updatedUsers = 0;

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();

      const [actualFollowers, actualFollowing] = await Promise.all([
        getActualFollowCount(userDoc.id, 'followersCount'),
        getActualFollowCount(userDoc.id, 'followingCount'),
      ]);

      const storedFollowers = getStoredFollowCount(user, 'followersCount');
      const storedFollowing = getStoredFollowCount(user, 'followingCount');

      const update: Record<string, number | FieldValue> = {};

      if (actualFollowers !== storedFollowers) {
        update['followersCount'] = actualFollowers;
      }

      if (actualFollowing !== storedFollowing) {
        update['followingCount'] = actualFollowing;
      }

      if (Object.keys(update).length === 0) {
        continue;
      }

      logger.info('resyncFollowCounts: correcting follow counts', {
        userId: userDoc.id,
        storedFollowers,
        actualFollowers,
        storedFollowing,
        actualFollowing,
      });

      batch.update(userDoc.ref, {
        ...update,
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

    logger.info('resyncFollowCounts: weekly follow-count resync complete', {
      totalUsers: usersSnapshot.size,
      updatedUsers,
    });
  },
);
