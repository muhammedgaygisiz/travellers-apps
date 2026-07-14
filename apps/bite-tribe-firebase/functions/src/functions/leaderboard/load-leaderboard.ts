import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  LeaderboardUser,
  LEADERBOARD_DOC,
  META_COLLECTION,
  USERS_COLLECTION,
  rebuildLeaderboard,
} from '../shared/utils/leaderboard';

const BITES_COLLECTION = 'bites';
const WRITE_BATCH_LIMIT = 500;

const db = admin.firestore();

const getActualBiteCount = async (userId: string): Promise<number> => {
  const countSnap = await db
    .collection(BITES_COLLECTION)
    .where('userId', '==', userId)
    .count()
    .get();

  return countSnap.data().count;
};

const refreshBiteCountsIfNeeded = async (): Promise<void> => {
  const usersSnapshot = await db.collection(USERS_COLLECTION).get();
  const usersWithoutBiteCount = usersSnapshot.docs.filter((userDoc) => {
    const user = userDoc.data();

    return typeof user['biteCount'] !== 'number';
  });

  logger.info('loadLeaderboard: user biteCount migration check finished', {
    totalUsers: usersSnapshot.size,
    usersWithoutBiteCount: usersWithoutBiteCount.length,
  });

  if (usersWithoutBiteCount.length === 0) {
    return;
  }

  logger.info(
    'loadLeaderboard: missing biteCount detected; refreshing counts for all users',
  );

  let batch = db.batch();
  let batchSize = 0;
  let processedUsers = 0;

  for (const userDoc of usersSnapshot.docs) {
    const biteCount = await getActualBiteCount(userDoc.id);

    batch.update(userDoc.ref, {
      biteCount,
      updatedAt: FieldValue.serverTimestamp(),
    });
    batchSize++;
    processedUsers++;

    if (batchSize === WRITE_BATCH_LIMIT) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) {
    await batch.commit();
  }

  logger.info('loadLeaderboard: biteCount refresh complete', {
    processedUsers,
  });
};

const readPersistedLeaderboard = async (): Promise<
  LeaderboardUser[] | null
> => {
  const leaderboardDoc = await db
    .collection(META_COLLECTION)
    .doc(LEADERBOARD_DOC)
    .get();

  if (!leaderboardDoc.exists) {
    return null;
  }

  const users = leaderboardDoc.data()?.['users'];

  return Array.isArray(users) ? (users as LeaderboardUser[]) : null;
};

export const loadLeaderboard = onAppCheck<void>(async (request) => {
  if (!request.auth) {
    logger.warn('loadLeaderboard: unauthenticated request rejected');
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to load the leaderboard.',
    );
  }

  logger.info('loadLeaderboard: request received', {
    uid: request.auth.uid,
  });

  // TODO(#905): Remove this temporary backfill after the first production migration run.
  await refreshBiteCountsIfNeeded();

  // Serve the persisted ranking from meta/leaderboard instead of querying the
  // whole users collection on every request. The document is kept up to date by
  // the bite create/delete triggers; rebuild it on demand when it is missing
  // (e.g. before the first bite write after this feature ships).
  let leaderboardUsers = await readPersistedLeaderboard();

  if (!leaderboardUsers) {
    logger.info('loadLeaderboard: no persisted leaderboard found; rebuilding');
    leaderboardUsers = await rebuildLeaderboard(db);
  }

  logger.info('loadLeaderboard: query finished', {
    returnedUsers: leaderboardUsers.length,
    topUsers: leaderboardUsers.map((user) => ({
      userId: user.userId,
      public: user.public,
      biteCount: user.biteCount,
    })),
  });

  return leaderboardUsers;
});
