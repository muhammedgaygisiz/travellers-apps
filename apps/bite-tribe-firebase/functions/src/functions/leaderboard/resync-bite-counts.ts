import {
  DocumentData,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/scheduler';
import {
  NO_POSTING_STREAK_STATS,
  PostingStreakStats,
  readPostingStreak,
  samePostingStreak,
  tallyPostingStreak,
} from '../shared/utils/posting-streak';
import { recomputeUserPostingStreak } from '../shared/utils/user-posting-streak';

const USERS_COLLECTION = 'users';
const BITES_COLLECTION = 'bites';
const META_COLLECTION = 'meta';
/** Read by the daily analytics digest (issue #2150). */
export const POSTING_STREAK_STATS_DOC = 'postingStreakStats';
const WRITE_BATCH_LIMIT = 500;

const ZURICH_TZ = 'Europe/Zurich';

const db = getFirestore();

/**
 * Reads the biteCount currently stored on a user document, defaulting to 0
 * when the field is missing or not a number.
 */
export const getStoredBiteCount = (user: DocumentData): number =>
  typeof user['biteCount'] === 'number' ? user['biteCount'] : 0;

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
 *
 * The same pass recomputes the weekly posting streak, `postingStreak`, from the
 * user's Bites (issue #2146). Running on Monday, it zeroes every streak whose
 * last posting week is older than the week that has just ended.
 *
 * It ends by writing the run's aggregates to `/meta/postingStreakStats` for the
 * daily analytics digest (issue #2150): users at 2 weeks or more, and streaks
 * this run took from 1 or more to 0. Counts only, never a user id.
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
    let updatedStreaks = 0;
    let streakStats: PostingStreakStats = NO_POSTING_STREAK_STATS;

    const now = Date.now();

    for (const userDoc of usersSnapshot.docs) {
      const user = userDoc.data();
      const actualBiteCount = await getActualBiteCount(userDoc.id);
      const storedBiteCount = getStoredBiteCount(user);
      // The streak is recomputed from the Bites that exist, which is how a
      // deleted Bite and a missed week reach it (issue #2146).
      const postingStreak = await recomputeUserPostingStreak(
        db,
        userDoc.id,
        now,
      );
      const storedPostingStreak = readPostingStreak(user['postingStreak']);
      streakStats = tallyPostingStreak(
        streakStats,
        storedPostingStreak,
        postingStreak,
      );
      const update: DocumentData = {};

      if (actualBiteCount !== storedBiteCount) {
        logger.info('resyncBiteCounts: correcting biteCount', {
          userId: userDoc.id,
          storedBiteCount,
          actualBiteCount,
        });
        update['biteCount'] = actualBiteCount;
      }

      if (!samePostingStreak(storedPostingStreak, postingStreak)) {
        update['postingStreak'] = postingStreak;
        updatedStreaks++;
      }

      if (Object.keys(update).length === 0) {
        continue;
      }

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

    await db
      .collection(META_COLLECTION)
      .doc(POSTING_STREAK_STATS_DOC)
      .set({
        ...streakStats,
        totalUsers: usersSnapshot.size,
        computedAt: FieldValue.serverTimestamp(),
      });

    logger.info('resyncBiteCounts: weekly biteCount resync complete', {
      totalUsers: usersSnapshot.size,
      updatedUsers,
      updatedStreaks,
      ...streakStats,
    });
  },
);
