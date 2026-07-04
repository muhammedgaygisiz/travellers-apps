import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from './callable-options';

const USERS_COLLECTION = 'users';
const BITES_COLLECTION = 'bites';
const LEADERBOARD_LIMIT = 10;
const WRITE_BATCH_LIMIT = 500;

interface LeaderboardUser {
  userId: string;
  displayName: string;
  email: string;
  photoUrl: string;
  city?: string;
  public?: boolean;
  biteCount: number;
}

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

const toLeaderboardUser = (
  doc: admin.firestore.QueryDocumentSnapshot,
): LeaderboardUser => {
  const user = doc.data();
  const publicUser = user['public'] === true;

  return {
    userId: typeof user['userId'] === 'string' ? user['userId'] : doc.id,
    displayName:
      publicUser && typeof user['displayName'] === 'string'
        ? user['displayName']
        : '',
    email: publicUser && typeof user['email'] === 'string' ? user['email'] : '',
    photoUrl:
      publicUser && typeof user['photoUrl'] === 'string'
        ? user['photoUrl']
        : '',
    ...(publicUser && typeof user['city'] === 'string'
      ? { city: user['city'] }
      : {}),
    public: publicUser,
    biteCount: typeof user['biteCount'] === 'number' ? user['biteCount'] : 0,
  };
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

  const leaderboardSnapshot = await db
    .collection(USERS_COLLECTION)
    .orderBy('biteCount', 'desc')
    .limit(LEADERBOARD_LIMIT)
    .get();

  const leaderboardUsers = leaderboardSnapshot.docs.map(toLeaderboardUser);

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
