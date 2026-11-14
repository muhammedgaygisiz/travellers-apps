import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onAppCheck } from '../shared/callable-options';
import {
  LeaderboardUser,
  readPersistedLeaderboard,
  rebuildLeaderboard,
} from '../shared/utils/leaderboard';
import {
  freezeLastWeek,
  readWeeklyLeaderboard,
  WeeklyLeaderboard,
} from '../shared/utils/weekly-leaderboard';
import { requireMember } from '../shared/roles';

const db = getFirestore();

/**
 * Which ranking the app asks for (issue #2027). `thisWeek` is the running
 * week, `lastWeek` the frozen final standings of the week before, and
 * `allTime` the ranking by every Bite a user created.
 */
export type LeaderboardBoard = 'thisWeek' | 'lastWeek' | 'allTime';

export interface LoadLeaderboardRequest {
  board?: LeaderboardBoard;
}

/** What a request naming a board gets back. */
export interface LeaderboardResponse {
  board: LeaderboardBoard;
  users: LeaderboardUser[];
  /** The week's bounds, epoch ms; absent on the all-time board. */
  start?: number;
  end?: number;
}

const BOARDS: readonly LeaderboardBoard[] = ['thisWeek', 'lastWeek', 'allTime'];

const readAllTime = async (): Promise<LeaderboardUser[]> => {
  // Served from meta/leaderboard instead of querying the whole users
  // collection on every request. The document is kept up to date by the bite
  // create/delete triggers; rebuild it on demand when it is missing (e.g.
  // before the first bite write after this feature ships).
  const users = await readPersistedLeaderboard(db);

  if (users) {
    return users;
  }

  logger.info('loadLeaderboard: no persisted leaderboard found; rebuilding');

  return rebuildLeaderboard(db);
};

const fromWeek = (
  board: LeaderboardBoard,
  week: WeeklyLeaderboard,
): LeaderboardResponse => ({
  board,
  users: week.users,
  start: week.start,
  end: week.end,
});

export const loadLeaderboard = onAppCheck<LoadLeaderboardRequest | undefined>(
  async (request) => {
    try {
      requireMember(request, 'You must be signed in to load the leaderboard.');
    } catch (error) {
      // The guard refuses a signed-out caller and an anonymous table guest,
      // and this log is older than the second case. It covers both now: what
      // it is for is noticing a client calling this without an account.
      logger.warn('loadLeaderboard: request without an account rejected');

      throw error;
    }

    const requested = request.data?.board;

    logger.info('loadLeaderboard: request received', {
      uid: request.auth.uid,
      board: requested ?? 'legacy',
    });

    // A build from before the weekly board sends no board and expects the
    // all-time ranking as a bare array. It keeps getting exactly that.
    if (!requested || !BOARDS.includes(requested)) {
      return readAllTime();
    }

    if (requested === 'allTime') {
      return { board: requested, users: await readAllTime() };
    }

    if (requested === 'lastWeek') {
      // Normally frozen by the Monday reset; frozen here on first read if the
      // reset has not run yet, and never rewritten once it exists.
      return fromWeek(requested, await freezeLastWeek(db));
    }

    return fromWeek(requested, await readWeeklyLeaderboard(db));
  },
);
