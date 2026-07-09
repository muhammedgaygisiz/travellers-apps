import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

export const USERS_COLLECTION = 'users';
export const META_COLLECTION = 'meta';
export const LEADERBOARD_DOC = 'leaderboard';
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
 * A user is eligible for the leaderboard only when their profile is public.
 * Anonymous (non-public) users are ignored entirely.
 */
export const isPublicUser = (
  doc: admin.firestore.QueryDocumentSnapshot,
): boolean => doc.data()['public'] === true;

/**
 * Maps a raw user document into the public leaderboard representation.
 */
export const toLeaderboardUser = (
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

/**
 * Scans users ordered by `biteCount` (descending) and collects the top
 * {@link LEADERBOARD_LIMIT} public users, skipping anonymous (non-public) users.
 *
 * Paging over the single-field `biteCount` index — instead of adding a
 * `where('public', '==', true)` clause — keeps the ranking correct without
 * requiring a composite index that the functions-only deploy would not create.
 */
const collectTopPublicUsers = async (
  db: admin.firestore.Firestore,
): Promise<LeaderboardUser[]> => {
  const users: LeaderboardUser[] = [];
  let cursor: admin.firestore.QueryDocumentSnapshot | undefined;

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
  db: admin.firestore.Firestore,
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
