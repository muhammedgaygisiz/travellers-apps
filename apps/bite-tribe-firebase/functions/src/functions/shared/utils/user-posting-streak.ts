import { Firestore, Transaction } from 'firebase-admin/firestore';
import {
  advancePostingStreak,
  computePostingStreak,
  PostingStreak,
  readPostingStreak,
  samePostingStreak,
} from './posting-streak';

/**
 * The creation times of every Bite the user has. Only `createdAtTimestamp` is
 * read, and a Bite without one is skipped: a Bite with no creation time cannot
 * be placed in a week.
 */
const readCreationTimes = async (
  db: Firestore,
  userId: string,
  transaction?: Transaction,
): Promise<number[]> => {
  const query = db
    .collection('bites')
    .where('userId', '==', userId)
    .select('createdAtTimestamp');
  const snapshot = transaction
    ? await transaction.get(query)
    : await query.get();

  return snapshot.docs
    .map((doc) => doc.get('createdAtTimestamp'))
    .filter((value): value is number => typeof value === 'number');
};

/** The user's streak recomputed from all of their Bites. */
export const recomputeUserPostingStreak = (
  db: Firestore,
  userId: string,
  now: number,
): Promise<PostingStreak> =>
  readCreationTimes(db, userId).then((times) =>
    computePostingStreak(times, now),
  );

/**
 * Applies one new Bite to `users/{uid}.postingStreak` (issue #2146). Runs in a
 * transaction so two Bites posted at once cannot both read the same stored
 * value. The stored value is advanced on its own when it can be; when nothing
 * is stored yet, or the Bite is older than the stored last week, the streak is
 * recomputed from all of the user's Bites. Writes nothing when the value does
 * not change.
 */
export const applyBiteToPostingStreak = (
  db: Firestore,
  userId: string,
  biteCreatedAt: number,
  now: number,
): Promise<PostingStreak> => {
  const userRef = db.doc(`users/${userId}`);

  return db.runTransaction(async (transaction) => {
    const userSnap = await transaction.get(userRef);
    const stored = readPostingStreak(userSnap.get('postingStreak'));
    const next =
      advancePostingStreak(stored, biteCreatedAt) ??
      // The new Bite is passed in as well, for a Bite whose own creation time
      // is missing and was taken from the event.
      computePostingStreak(
        [...(await readCreationTimes(db, userId, transaction)), biteCreatedAt],
        now,
      );

    if (userSnap.exists && !samePostingStreak(stored, next)) {
      transaction.update(userRef, { postingStreak: next });
    }

    return next;
  });
};
