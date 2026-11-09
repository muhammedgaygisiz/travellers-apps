import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { isListableBite } from '../shared/utils/bite-listability';
import {
  BLOCKED_BY_SUBCOLLECTION,
  BLOCKED_SUBCOLLECTION,
  USERS_COLLECTION,
} from '../shared/utils/user-blocks';

/**
 * The users a Bite's creator ate with (GitHub issue #1915).
 *
 * Not to be confused with a Bite's free-text `tags`. A tagged user is an
 * account, named by its uid.
 */
export const TAGGED_USER_IDS_FIELD = 'taggedUserIds';

/** Mirrors the limit `firestore.rules` enforces on `bites/{biteId}`. */
export const MAX_TAGGED_USERS = 10;

const BITES_COLLECTION = 'bites';
const FOLLOWING_SUBCOLLECTION = 'following';

/** Batch size for the cleanup queries; Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

/**
 * The tagged uids a stored Bite carries, read defensively: anything that is
 * not a non-empty string is dropped, and a uid listed twice counts once.
 */
export const taggedUserIdsOf = (bite: unknown): string[] => {
  const value = (bite as Record<string, unknown> | undefined)?.[
    TAGGED_USER_IDS_FIELD
  ];

  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (entry): entry is string => typeof entry === 'string' && !!entry,
      ),
    ),
  ];
};

const sameList = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((entry, index) => entry === b[index]);

/**
 * Which tagged uids survive a write to a Bite.
 *
 * Rules cap the list and keep the creator out of it, but they cannot read a
 * follow, a profile or a block for each entry, so this does.
 *
 * - **Following and a public profile gate the act of tagging only.** They are
 *   checked for the uids this write added, never for ones the Bite already
 *   carried: unfollowing somebody, or them turning private later, does not
 *   take them off the Bite. The details row leaves a private profile out at
 *   render time instead.
 * - **A block in either direction removes the tag**, whenever it was added.
 *   `blockUser` cleans existing Bites up when the block is placed; this is
 *   the backstop for a stale client resending a list from before it.
 *
 * A Bite without a creator (its author deleted their account) can gain no
 * one: there is nobody whose follows could allow it.
 */
export const validTaggedUserIds = async (
  db: Firestore,
  before: unknown,
  after: unknown,
): Promise<string[]> => {
  const creatorUid = (after as { userId?: unknown } | undefined)?.userId;
  const previous = new Set(taggedUserIdsOf(before));
  const candidates = taggedUserIdsOf(after)
    .filter((uid) => uid !== creatorUid)
    .slice(0, MAX_TAGGED_USERS);

  if (candidates.length === 0) {
    return [];
  }

  if (typeof creatorUid !== 'string' || !creatorUid) {
    return candidates.filter((uid) => previous.has(uid));
  }

  const users = db.collection(USERS_COLLECTION);
  const creator = users.doc(creatorUid);
  const added = candidates.filter((uid) => !previous.has(uid));

  const [blocked, blockedBy, following, profiles] = await Promise.all([
    db.getAll(
      ...candidates.map((uid) =>
        creator.collection(BLOCKED_SUBCOLLECTION).doc(uid),
      ),
    ),
    db.getAll(
      ...candidates.map((uid) =>
        creator.collection(BLOCKED_BY_SUBCOLLECTION).doc(uid),
      ),
    ),
    added.length
      ? db.getAll(
          ...added.map((uid) =>
            creator.collection(FOLLOWING_SUBCOLLECTION).doc(uid),
          ),
        )
      : Promise.resolve([]),
    added.length
      ? db.getAll(...added.map((uid) => users.doc(uid)))
      : Promise.resolve([]),
  ]);

  const onBlockEdge = new Set(
    [...blocked, ...blockedBy]
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => snapshot.id),
  );
  const followed = new Set(
    following.filter((snapshot) => snapshot.exists).map((s) => s.id),
  );
  const publicProfiles = new Set(
    profiles
      .filter((snapshot) => snapshot.data()?.['public'] === true)
      .map((snapshot) => snapshot.id),
  );

  return candidates.filter(
    (uid) =>
      !onBlockEdge.has(uid) &&
      (previous.has(uid) || (followed.has(uid) && publicProfiles.has(uid))),
  );
};

/**
 * The list to write back, or `undefined` when the stored one is already
 * valid. Returning `undefined` for an unchanged list is what keeps the
 * trigger from triggering itself: its own write stores a valid list, so the
 * write it causes comes back here as nothing to do.
 */
export const taggedUserIdsToWrite = async (
  db: Firestore,
  before: unknown,
  after: unknown,
): Promise<string[] | undefined> => {
  if (!after) {
    return undefined;
  }

  const stored = (after as Record<string, unknown>)[TAGGED_USER_IDS_FIELD];

  if (stored === undefined) {
    return undefined;
  }

  const storedList = Array.isArray(stored) ? (stored as unknown[]) : [];
  const beforeList = (before as Record<string, unknown> | undefined)?.[
    TAGGED_USER_IDS_FIELD
  ];

  // Nothing about the list moved, so nothing the trigger checks can have
  // changed either: a like counter or a rename is not a reason to re-read.
  if (
    Array.isArray(stored) &&
    Array.isArray(beforeList) &&
    sameList(storedList as string[], beforeList as string[])
  ) {
    return undefined;
  }

  const valid = await validTaggedUserIds(db, before, after);

  return Array.isArray(stored) && sameList(storedList as string[], valid)
    ? undefined
    : valid;
};

/**
 * Who a write to a Bite should tell they were tagged (GitHub issue #1919).
 *
 * Nobody while the Bite is not listable: its photo has not uploaded, so the
 * Bite would open as one that does not exist. The moment it becomes
 * listable, every valid tagged user is told at once - they were added while
 * nobody could see the Bite. After that, only the uids a write adds.
 *
 * `valid` is the list the write leaves behind once checked, so a uid the
 * trigger removes is never told. On the listability transition the stored
 * list may not have been checked yet - the photo can land before the
 * trigger of the write that added a uid has run - so every uid is checked
 * there as though it had just been added.
 */
export const taggedUserIdsToNotify = async (
  db: Firestore,
  before: unknown,
  after: unknown,
  valid: readonly string[],
): Promise<string[]> => {
  if (!after || !isListableBite(after as { imageStatus?: unknown })) {
    return [];
  }

  const wasListable =
    !!before && isListableBite(before as { imageStatus?: unknown });

  if (wasListable) {
    const previous = new Set(taggedUserIdsOf(before));

    return valid.filter((uid) => !previous.has(uid));
  }

  const checked = new Set(await validTaggedUserIds(db, undefined, after));

  return valid.filter((uid) => checked.has(uid));
};

/**
 * Takes `taggedUid` off every Bite that lists it, optionally only off the
 * Bites `creatorUid` created. Returns how many Bites changed.
 *
 * The query is a single-field `array-contains`, which Firestore indexes at
 * collection scope by default, and the creator is filtered here rather than
 * in the query so that no composite index is needed. Every match is updated
 * with `arrayRemove`, so the matching set shrinks and re-running converges.
 */
export const removeTaggedUserFromBites = async (
  db: Firestore,
  taggedUid: string,
  creatorUid?: string,
): Promise<number> => {
  const query = db
    .collection(BITES_COLLECTION)
    .where(TAGGED_USER_IDS_FIELD, 'array-contains', taggedUid);
  let removed = 0;

  for (;;) {
    const snapshot = await query.get();
    const matches = snapshot.docs.filter(
      (doc) => creatorUid === undefined || doc.data()['userId'] === creatorUid,
    );

    if (matches.length === 0) {
      return removed;
    }

    for (let index = 0; index < matches.length; index += WRITE_BATCH_LIMIT) {
      const batch = db.batch();

      matches.slice(index, index + WRITE_BATCH_LIMIT).forEach((doc) =>
        batch.update(doc.ref, {
          [TAGGED_USER_IDS_FIELD]: FieldValue.arrayRemove(taggedUid),
        }),
      );
      await batch.commit();
    }

    removed += matches.length;

    // Filtered by creator, the rest of the matches belong to other creators
    // and were left alone on purpose, so one pass is all there is.
    if (creatorUid !== undefined) {
      return removed;
    }
  }
};

/**
 * Removes the tags between two accounts in both directions: `a` off the Bites
 * `b` created, and `b` off the Bites `a` created.
 */
export const removeTagsBetween = async (
  db: Firestore,
  a: string,
  b: string,
): Promise<number> =>
  (await removeTaggedUserFromBites(db, a, b)) +
  (await removeTaggedUserFromBites(db, b, a));
