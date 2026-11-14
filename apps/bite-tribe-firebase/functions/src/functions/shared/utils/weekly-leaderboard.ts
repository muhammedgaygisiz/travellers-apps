import {
  FieldValue,
  Firestore,
  QueryDocumentSnapshot,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import {
  isPublicUser,
  LEADERBOARD_LIMIT,
  LeaderboardUser,
  META_COLLECTION,
  toLeaderboardUser,
  USERS_COLLECTION,
} from './leaderboard';

const BITES_COLLECTION = 'bites';

/** The ranking of the running week, rebuilt on every Bite create or delete. */
export const LEADERBOARD_WEEKLY_DOC = 'leaderboardWeekly';

/**
 * The final standings of the previous week, frozen at the reset and never
 * rebuilt afterwards (issue #2027).
 */
export const LEADERBOARD_LAST_WEEK_DOC = 'leaderboardLastWeek';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** A week runs from Monday 00:00 UTC up to, not including, the next one. */
export interface LeaderboardWeek {
  /** Monday 00:00 UTC, epoch milliseconds. */
  start: number;
  /** The following Monday 00:00 UTC, epoch milliseconds (exclusive). */
  end: number;
}

/**
 * The week `now` falls in. Weeks start on Monday 00:00 UTC for everyone,
 * whatever their time zone, so the whole board resets at the same moment.
 */
export const weekOf = (now: number): LeaderboardWeek => {
  const date = new Date(now);
  const midnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  // getUTCDay is 0 for Sunday; days since Monday is 0..6.
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  const start = midnight - daysSinceMonday * DAY_MS;

  return { start, end: start + WEEK_MS };
};

/** The week before the one `now` falls in. */
export const previousWeekOf = (now: number): LeaderboardWeek => {
  const { start } = weekOf(now);

  return { start: start - WEEK_MS, end: start };
};

/** A stable key for a week, its Monday as `YYYY-MM-DD`. */
export const weekKey = (week: LeaderboardWeek): string =>
  new Date(week.start).toISOString().slice(0, 10);

/** One Bite as the weekly tally needs it. */
export interface WeeklyBite {
  userId: string;
  createdAtTimestamp: number;
}

/** A user's Bites within one week, before the profile is looked up. */
export interface WeeklyTally {
  userId: string;
  count: number;
  /** When the user reached that count: the time of their latest Bite. */
  reachedAt: number;
}

/**
 * Counts each author's Bites and orders them best-first. Two users with the
 * same count are ordered by who got there first, so a tie is decided by
 * something the user did rather than by their id.
 */
export const tallyWeeklyBites = (bites: WeeklyBite[]): WeeklyTally[] => {
  const tallies = new Map<string, WeeklyTally>();

  for (const bite of bites) {
    if (!bite.userId) {
      continue;
    }

    const tally = tallies.get(bite.userId);

    if (tally) {
      tally.count += 1;
      tally.reachedAt = Math.max(tally.reachedAt, bite.createdAtTimestamp);
    } else {
      tallies.set(bite.userId, {
        userId: bite.userId,
        count: 1,
        reachedAt: bite.createdAtTimestamp,
      });
    }
  }

  return [...tallies.values()].sort(
    (a, b) => b.count - a.count || a.reachedAt - b.reachedAt,
  );
};

const readWeekBites = async (
  db: Firestore,
  week: LeaderboardWeek,
): Promise<WeeklyBite[]> => {
  // A single-field range on createdAtTimestamp needs no composite index.
  const snapshot = await db
    .collection(BITES_COLLECTION)
    .where('createdAtTimestamp', '>=', week.start)
    .where('createdAtTimestamp', '<', week.end)
    .get();

  return snapshot.docs.map((doc) => ({
    userId: doc.data()['userId'] as string,
    createdAtTimestamp: doc.data()['createdAtTimestamp'] as number,
  }));
};

/**
 * Builds the top {@link LEADERBOARD_LIMIT} public users of one week from the
 * Bites created in it. `biteCount` on each entry is that week's count, not the
 * all-time one. Non-public and deleted accounts are skipped, as on the
 * all-time board.
 */
export const collectWeeklyRanking = async (
  db: Firestore,
  week: LeaderboardWeek,
): Promise<LeaderboardUser[]> => {
  const tallies = tallyWeeklyBites(await readWeekBites(db, week));
  const ranking: LeaderboardUser[] = [];

  // Profiles are fetched a page at a time in ranking order, so a busy week
  // reads only as many user documents as it takes to fill the board.
  for (
    let offset = 0;
    offset < tallies.length && ranking.length < LEADERBOARD_LIMIT;
    offset += LEADERBOARD_LIMIT
  ) {
    const page = tallies.slice(offset, offset + LEADERBOARD_LIMIT);
    const docs = await db.getAll(
      ...page.map((tally) => db.collection(USERS_COLLECTION).doc(tally.userId)),
    );

    page.forEach((tally, index) => {
      const doc = docs[index];

      if (
        ranking.length < LEADERBOARD_LIMIT &&
        doc.exists &&
        isPublicUser(doc as QueryDocumentSnapshot)
      ) {
        ranking.push({
          ...toLeaderboardUser(doc as QueryDocumentSnapshot),
          biteCount: tally.count,
        });
      }
    });
  }

  return ranking;
};

/** A weekly board as stored in `/meta` and returned to the app. */
export interface WeeklyLeaderboard {
  week: string;
  start: number;
  end: number;
  users: LeaderboardUser[];
}

const toWeeklyLeaderboard = (
  week: LeaderboardWeek,
  users: LeaderboardUser[],
): WeeklyLeaderboard => ({
  week: weekKey(week),
  start: week.start,
  end: week.end,
  users,
});

/**
 * Recomputes the running week's board and persists it to
 * `meta/leaderboardWeekly`.
 */
export const rebuildWeeklyLeaderboard = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<WeeklyLeaderboard> => {
  const week = weekOf(now);
  const board = toWeeklyLeaderboard(week, await collectWeeklyRanking(db, week));

  await db
    .collection(META_COLLECTION)
    .doc(LEADERBOARD_WEEKLY_DOC)
    .set({ ...board, updatedAt: FieldValue.serverTimestamp() });

  logger.info('rebuildWeeklyLeaderboard: weekly leaderboard persisted', {
    week: board.week,
    returnedUsers: board.users.length,
  });

  return board;
};

const readBoard = async (
  db: Firestore,
  docId: string,
): Promise<WeeklyLeaderboard | null> => {
  const data = (await db.collection(META_COLLECTION).doc(docId).get()).data();

  if (
    !data ||
    typeof data['week'] !== 'string' ||
    !Array.isArray(data['users'])
  ) {
    return null;
  }

  return {
    week: data['week'],
    start: data['start'] as number,
    end: data['end'] as number,
    users: data['users'] as LeaderboardUser[],
  };
};

/**
 * The running week's board. A stored board from an earlier week is stale -
 * no Bite has been written since the reset - so the week is rebuilt, which
 * is what makes the board read empty right after Monday 00:00 UTC.
 */
export const readWeeklyLeaderboard = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<WeeklyLeaderboard> => {
  const stored = await readBoard(db, LEADERBOARD_WEEKLY_DOC);

  if (stored && stored.week === weekKey(weekOf(now))) {
    return stored;
  }

  return rebuildWeeklyLeaderboard(db, now);
};

/**
 * Freezes the previous week's final standings into `meta/leaderboardLastWeek`.
 * Run by the Monday reset; a no-op when that week is already frozen, so a
 * retried run or a lazy read never rewrites a result people have seen.
 */
export const freezeLastWeek = async (
  db: Firestore,
  now: number = Date.now(),
): Promise<WeeklyLeaderboard> => {
  const week = previousWeekOf(now);
  const stored = await readBoard(db, LEADERBOARD_LAST_WEEK_DOC);

  if (stored && stored.week === weekKey(week)) {
    return stored;
  }

  const board = toWeeklyLeaderboard(week, await collectWeeklyRanking(db, week));

  await db
    .collection(META_COLLECTION)
    .doc(LEADERBOARD_LAST_WEEK_DOC)
    .set({ ...board, frozenAt: FieldValue.serverTimestamp() });

  logger.info('freezeLastWeek: last week frozen', {
    week: board.week,
    returnedUsers: board.users.length,
  });

  return board;
};
