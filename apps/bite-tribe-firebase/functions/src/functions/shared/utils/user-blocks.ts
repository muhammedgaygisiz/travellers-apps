import { Firestore } from 'firebase-admin/firestore';

/**
 * A user-to-user block (GitHub issue #1609).
 *
 * Stored as a mirrored edge, like the follow relation:
 * `users/{blocker}/blocked/{blocked}` is the blocker's own list and the only
 * side anybody reads, and `users/{blocked}/blockedBy/{blocker}` exists so the
 * account-deletion cascade can find and remove the edges an account appears
 * on without a collection-group query. Both are written by the backend alone:
 * the blocker cannot remove the reverse follow edge from the client, and the
 * blocked account must not be able to read either side.
 *
 * Not to be confused with the operator block (`setUserBlocked`, issue #1474),
 * which disables the Auth account itself.
 */
export const USERS_COLLECTION = 'users';
export const BLOCKED_SUBCOLLECTION = 'blocked';
export const BLOCKED_BY_SUBCOLLECTION = 'blockedBy';

/**
 * The uids the viewer has blocked, read once per request.
 *
 * Read failures resolve to an empty set rather than failing the read the
 * caller is serving: a feed that shows a blocked account's Bite is a worse
 * outcome than no feed only for the blocker, and the client applies the same
 * filter to what it holds.
 */
export const loadBlockedUids = async (
  db: Firestore,
  viewerUid: string | undefined,
): Promise<Set<string>> => {
  if (!viewerUid) {
    return new Set();
  }

  try {
    const snapshot = await db
      .collection(USERS_COLLECTION)
      .doc(viewerUid)
      .collection(BLOCKED_SUBCOLLECTION)
      .get();

    return new Set(snapshot.docs.map((doc) => doc.id));
  } catch {
    return new Set();
  }
};

/** Whether `uid` names an account in `blockedUids`. */
export const isBlockedUid = (
  uid: unknown,
  blockedUids: ReadonlySet<string>,
): boolean => typeof uid === 'string' && blockedUids.has(uid);
