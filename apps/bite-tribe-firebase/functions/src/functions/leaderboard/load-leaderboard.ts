import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  LeaderboardUser,
  LEADERBOARD_DOC,
  META_COLLECTION,
  rebuildLeaderboard,
} from '../shared/utils/leaderboard';

const db = getFirestore();

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
