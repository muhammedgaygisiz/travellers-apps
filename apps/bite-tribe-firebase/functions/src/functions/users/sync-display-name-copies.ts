import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/firestore';
import {
  LEADERBOARD_DAILY_DOC,
  LEADERBOARD_DOC,
  LeaderboardUser,
  META_COLLECTION,
  toLeaderboardEntry,
} from '../shared/utils/leaderboard';
import { USERS_COLLECTION } from './display-name-utils';

const REVIEWS_COLLECTION = 'reviews';
const BITE_TRAILS_COLLECTION = 'biteTrails';

/** Documents written per batch. Firestore's hard limit is 500. */
const WRITE_BATCH_LIMIT = 400;

const displayNameOf = (data: Record<string, unknown> | undefined): string =>
  typeof data?.['displayName'] === 'string' ? data['displayName'].trim() : '';

/**
 * Rewrites the user's entry in one persisted leaderboard snapshot.
 *
 * Both snapshots are readable by every member, and nothing else rewrites them
 * until a Bite is created or deleted (or the next daily run, for the
 * baseline), so without this an old name stays on the leaderboard for as long
 * as nobody posts. An entry that is not public carries no name and is left
 * alone, so a rename cannot publish a name the snapshot deliberately blanked.
 */
const renameInLeaderboardSnapshot = async (
  db: Firestore,
  docId: string,
  uid: string,
  displayName: string,
): Promise<boolean> => {
  const ref = db.collection(META_COLLECTION).doc(docId);
  const users = (await ref.get()).data()?.['users'];

  if (!Array.isArray(users)) {
    return false;
  }

  const entries = users as LeaderboardUser[];
  const stale = entries.some(
    (entry) =>
      entry?.userId === uid &&
      entry.public !== false &&
      entry.displayName !== displayName,
  );

  if (!stale) {
    return false;
  }

  await ref.set(
    {
      users: entries.map((entry) =>
        toLeaderboardEntry(
          entry?.userId === uid && entry.public !== false
            ? { ...entry, displayName }
            : entry,
        ),
      ),
    },
    { merge: true },
  );

  return true;
};

/**
 * Sets `field` to `displayName` on every document of `collection` whose
 * `ownerField` is `uid` and which does not already hold it. Returns the number
 * of documents written.
 */
const renameInCollection = async (
  db: Firestore,
  collection: string,
  ownerField: string,
  field: string,
  uid: string,
  displayName: string,
): Promise<number> => {
  const snapshot = await db
    .collection(collection)
    .where(ownerField, '==', uid)
    .get();
  const stale = snapshot.docs.filter(
    (doc) => doc.data()?.[field] !== displayName,
  );

  for (let start = 0; start < stale.length; start += WRITE_BATCH_LIMIT) {
    const batch = db.batch();

    stale
      .slice(start, start + WRITE_BATCH_LIMIT)
      .forEach((doc) => batch.update(doc.ref, { [field]: displayName }));

    await batch.commit();
  }

  return stale.length;
};

/**
 * Brings every stored copy of a user's display name in line with the one on
 * `/users/{uid}` (GitHub issue #1827).
 *
 * Most surfaces read the name live from the user document. These are the ones
 * that copy it, and an old name left in any of them is visible to other
 * accounts:
 *
 * - `meta/leaderboard` and `meta/leaderboardDaily`, the persisted rankings.
 * - `reviews.author`, denormalised at write time. The app resolves the name
 *   through `authorId` on read, but the stored field is readable by any member.
 * - `biteTrails.ownerName`, rendered as `@name` on every Bite Trail card.
 *
 * `BiteReport.authorDisplayName` is deliberately not rewritten: it is operator
 * evidence of what was reported, and no member can read it.
 *
 * Every write is skipped when the copy already holds the name, so a retried
 * event is a no-op.
 */
export const syncDisplayNameCopies = async (
  db: Firestore,
  uid: string,
  displayName: string,
): Promise<void> => {
  const [leaderboard, leaderboardDaily, reviews, biteTrails] =
    await Promise.all([
      renameInLeaderboardSnapshot(db, LEADERBOARD_DOC, uid, displayName),
      renameInLeaderboardSnapshot(db, LEADERBOARD_DAILY_DOC, uid, displayName),
      renameInCollection(
        db,
        REVIEWS_COLLECTION,
        'authorId',
        'author',
        uid,
        displayName,
      ),
      renameInCollection(
        db,
        BITE_TRAILS_COLLECTION,
        'ownerId',
        'ownerName',
        uid,
        displayName,
      ),
    ]);

  logger.info('syncDisplayNameCopies: copies rewritten', {
    uid,
    leaderboard,
    leaderboardDaily,
    reviews,
    biteTrails,
  });
};

/**
 * Fires on every user document update and acts only when `displayName`
 * changed. A trigger rather than a step in `claimDisplayName` so that every
 * path that writes the name - the callable, onboarding, an operator in the
 * console - leaves no stale copy behind.
 */
export const syncDisplayNameCopiesOnUserUpdate = onDocumentUpdated(
  `${USERS_COLLECTION}/{uid}`,
  async (event) => {
    const before = displayNameOf(event.data?.before.data());
    const after = displayNameOf(event.data?.after.data());

    if (before === after) {
      return;
    }

    await syncDisplayNameCopies(getFirestore(), event.params.uid, after);
  },
);
