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

/**
 * Whether either account has blocked the other, read as the two `blocked`
 * documents that would say so. Unlike {@link loadBlockedUids} a read failure
 * is not swallowed: this guards a write, and a write that should have been
 * refused is the worse outcome.
 */
export const blocksEitherWay = async (
  db: Firestore,
  uid: string,
  otherUid: string,
): Promise<boolean> => {
  const users = db.collection(USERS_COLLECTION);
  const [ownBlock, otherBlock] = await Promise.all([
    users.doc(uid).collection(BLOCKED_SUBCOLLECTION).doc(otherUid).get(),
    users.doc(otherUid).collection(BLOCKED_SUBCOLLECTION).doc(uid).get(),
  ]);

  return ownBlock.exists || otherBlock.exists;
};

/**
 * Every account that `uid` blocks or that blocks `uid`, read from the two
 * sides of the account's own block edges. Like {@link blocksEitherWay} a read
 * failure is not swallowed: this guards a send to those accounts, and a push
 * that reaches a blocked account is the worse outcome.
 */
export const loadBlockedEitherWayUids = async (
  db: Firestore,
  uid: string,
): Promise<Set<string>> => {
  const user = db.collection(USERS_COLLECTION).doc(uid);
  const [blocked, blockedBy] = await Promise.all([
    user.collection(BLOCKED_SUBCOLLECTION).get(),
    user.collection(BLOCKED_BY_SUBCOLLECTION).get(),
  ]);

  return new Set([...blocked.docs, ...blockedBy.docs].map((doc) => doc.id));
};

/** Whether `uid` names an account in `blockedUids`. */
export const isBlockedUid = (
  uid: unknown,
  blockedUids: ReadonlySet<string>,
): boolean => typeof uid === 'string' && blockedUids.has(uid);
