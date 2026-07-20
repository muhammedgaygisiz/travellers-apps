import { FieldValue, Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const USERS_COLLECTION = 'users';
export const META_COLLECTION = 'meta';
export const LEADERBOARD_DOC = 'leaderboard';
// Snapshot of the ranking as of the last daily notification run. The daily
// scheduled job compares the live leaderboard against this baseline to decide
// who moved, then overwrites it with the current ranking.
export const LEADERBOARD_DAILY_DOC = 'leaderboardDaily';
export const LEADERBOARD_LIMIT = 10;

// Number of users read per page while scanning for the top public users. A page
// larger than the limit keeps the number of round trips low even when several
// non-public users rank near the top.
const SCAN_PAGE_SIZE = 50;

export interface LeaderboardUser {
  userId: string;
  displayName: string;
  email: string;
  photoUrl: string;
  city?: string;
  public?: boolean;
  biteCount: number;
}

export interface Leaderboard {
  users: LeaderboardUser[];
}

/**
 * Describes how a single user's ranking changed between two persisted
 * leaderboard snapshots. `previousRank`/`currentRank` are 1-based; a `null`
 * value means the user was outside the persisted top {@link LEADERBOARD_LIMIT}
 * in that snapshot (i.e. a new entrant or someone who dropped out).
 */
export interface LeaderboardRankChange {
  userId: string;
  previousRank: number | null;
  currentRank: number | null;
  direction: 'up' | 'down';
}

const rankByUserId = (users: LeaderboardUser[]): Map<string, number> => {
  const ranks = new Map<string, number>();

  users.forEach((user, index) => {
    if (user.userId) {
      ranks.set(user.userId, index + 1);
    }
  });

  return ranks;
};

/**
 * Compares two persisted leaderboard snapshots (each ordered best-first) and
 * returns one entry per user whose ranking changed: users who climbed up,
 * dropped down, newly entered the top {@link LEADERBOARD_LIMIT}, or dropped out
 * of it. Users whose rank is unchanged are omitted.
 */
export const computeRankChanges = (
  previous: LeaderboardUser[],
  current: LeaderboardUser[],
): LeaderboardRankChange[] => {
  const previousRanks = rankByUserId(previous);
  const currentRanks = rankByUserId(current);
  const changes: LeaderboardRankChange[] = [];

  for (const [userId, currentRank] of currentRanks) {
    const previousRank = previousRanks.get(userId) ?? null;

    if (previousRank === null) {
      changes.push({
        userId,
        previousRank: null,
        currentRank,
        direction: 'up',
      });
    } else if (currentRank < previousRank) {
      changes.push({ userId, previousRank, currentRank, direction: 'up' });
    } else if (currentRank > previousRank) {
      changes.push({ userId, previousRank, currentRank, direction: 'down' });
    }
  }

  for (const [userId, previousRank] of previousRanks) {
    if (!currentRanks.has(userId)) {
      changes.push({
        userId,
        previousRank,
        currentRank: null,
        direction: 'down',
      });
    }
  }

  return changes;
};

/**
 * Builds the push-notification body describing a single user's rank change,
 * covering the four cases: dropped out of the top {@link LEADERBOARD_LIMIT},
 * newly entered it, climbed up, or slipped down.
 */
export const buildLeaderboardNotificationBody = (
  change: LeaderboardRankChange,
): string => {
  if (change.currentRank === null) {
    return `You dropped out of the top ${LEADERBOARD_LIMIT} on the leaderboard.`;
  }

  if (change.previousRank === null) {
    return `You entered the top ${LEADERBOARD_LIMIT} at #${change.currentRank} on the leaderboard! 🎉`;
  }

  if (change.direction === 'up') {
    return `You climbed up to #${change.currentRank} on the leaderboard! 🎉`;
  }

  return `You dropped to #${change.currentRank} on the leaderboard.`;
};

/**
 * A user is eligible for the leaderboard only when their profile is public.
 * Anonymous (non-public) users are ignored entirely.
 */
export const isPublicUser = (
  doc: QueryDocumentSnapshot,
): boolean => doc.data()['public'] === true;

/**
 * Maps a raw user document into the public leaderboard representation.
 */
export const toLeaderboardUser = (
  doc: QueryDocumentSnapshot,
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

/**
 * Scans users ordered by `biteCount` (descending) and collects the top
 * {@link LEADERBOARD_LIMIT} public users, skipping anonymous (non-public) users.
 *
 * Paging over the single-field `biteCount` index — instead of adding a
 * `where('public', '==', true)` clause — keeps the ranking correct without
 * requiring a composite index that the functions-only deploy would not create.
 */
const collectTopPublicUsers = async (
  db: Firestore,
): Promise<LeaderboardUser[]> => {
  const users: LeaderboardUser[] = [];
  let cursor: QueryDocumentSnapshot | undefined;

  while (users.length < LEADERBOARD_LIMIT) {
    let query = db
      .collection(USERS_COLLECTION)
      .orderBy('biteCount', 'desc')
      .limit(SCAN_PAGE_SIZE);

    if (cursor) {
      query = query.startAfter(cursor);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    for (const doc of snapshot.docs) {
      if (isPublicUser(doc)) {
        users.push(toLeaderboardUser(doc));

        if (users.length === LEADERBOARD_LIMIT) {
          break;
        }
      }
    }

    if (snapshot.size < SCAN_PAGE_SIZE) {
      break;
    }

    cursor = snapshot.docs[snapshot.docs.length - 1];
  }

  return users;
};

/**
 * Recomputes the top-{@link LEADERBOARD_LIMIT} public users ordered by
 * `biteCount` and persists them to the `meta/leaderboard` document, so the
 * ranking is stored in Firebase instead of being derived on every read. Returns
 * the freshly computed ranking.
 */
export const rebuildLeaderboard = async (
  db: Firestore,
): Promise<LeaderboardUser[]> => {
  const users = await collectTopPublicUsers(db);

  await db.collection(META_COLLECTION).doc(LEADERBOARD_DOC).set(
    {
      users,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  logger.info('rebuildLeaderboard: leaderboard persisted', {
    returnedUsers: users.length,
  });

  return users;
};
