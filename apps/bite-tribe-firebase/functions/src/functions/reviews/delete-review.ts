import {
  DocumentReference,
  DocumentSnapshot,
  FieldValue,
  Firestore,
  getFirestore,
  Query,
  QuerySnapshot,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { hiddenReviewRef, isHidden } from './hidden-review';

/**
 * Withdrawing a review or reply (GitHub issue #2116).
 *
 * Since issue #1283 a review is not a leaf: other accounts answer it, and their
 * replies are not the deleting author's to remove. So an item nobody answered
 * is deleted, and an item somebody answered becomes a **tombstone** - the same
 * document with its text, its author's name and its author's uid removed, and
 * `deletedAt` set. Everything that places it stays (`biteId`, `parentReviewId`,
 * `threadId`, the created timestamps), so the replies under it keep their
 * parent and the thread keeps its order.
 *
 * A tombstone exists only to hold replies up. When the last reply under one
 * goes, the tombstone goes too, and so on up the parent chain, so a thread of
 * nothing but tombstones does not stay on the Bite.
 *
 * `deleteOwnAccount` applies the same rule through {@link removeReviewsByAuthor}.
 */

const REVIEWS_COLLECTION = 'reviews';

/** Firestore allows 500 writes per batch; stay under it. */
const WRITE_BATCH_LIMIT = 450;

/**
 * How the walk up the parent chain reads: through the transaction for the
 * callable, straight from the database for the account deletion.
 */
interface Reader {
  doc(ref: DocumentReference): Promise<DocumentSnapshot>;
  query(query: Query): Promise<QuerySnapshot>;
}

const directReader: Reader = {
  doc: (ref) => ref.get(),
  query: (query) => query.get(),
};

export interface DeleteReviewRequest {
  reviewId?: unknown;
}

export interface DeleteReviewResponse {
  /** `deleted` when the document is gone, `tombstoned` when replies hold it up. */
  status: 'deleted' | 'tombstoned';
}

/**
 * What turns a review into a tombstone. `updatedAt` goes with the text: an
 * "edited" marker on text nobody can read says nothing.
 */
export const tombstoneUpdate = (now: Date): Record<string, unknown> => ({
  review: FieldValue.delete(),
  author: FieldValue.delete(),
  authorId: FieldValue.delete(),
  updatedAt: FieldValue.delete(),
  updatedAtTimestamp: FieldValue.delete(),
  hiddenAt: FieldValue.delete(),
  hiddenAtTimestamp: FieldValue.delete(),
  deletedAt: now.toISOString(),
  deletedAtTimestamp: now.getTime(),
});

export const isTombstone = (
  data: Record<string, unknown> | undefined,
): boolean => data?.['deletedAt'] !== undefined;

const idOf = (value: unknown): string => {
  const id = typeof value === 'string' ? value.trim() : '';

  if (!id || id.includes('/')) {
    throw new HttpsError('invalid-argument', 'reviewId is required.');
  }

  return id;
};

const repliesTo = (db: Firestore, reviewId: string): Query =>
  db.collection(REVIEWS_COLLECTION).where('parentReviewId', '==', reviewId);

/**
 * The tombstones above a review that is about to be deleted and would be left
 * holding nothing up, nearest first. `removed` is every review this write
 * already takes away, so a sibling that is going too does not count as a
 * reply that still needs its parent.
 */
const tombstonesLeftEmpty = async (
  read: Reader,
  db: Firestore,
  parentReviewId: unknown,
  removed: Set<string>,
): Promise<DocumentReference[]> => {
  const emptied: DocumentReference[] = [];
  let parentId = typeof parentReviewId === 'string' ? parentReviewId : '';

  while (parentId && !removed.has(parentId)) {
    const parentRef = db.collection(REVIEWS_COLLECTION).doc(parentId);
    const parent = await read.doc(parentRef);

    if (!parent.exists || !isTombstone(parent.data())) {
      break;
    }

    const replies = await read.query(repliesTo(db, parentId));
    const remaining = replies.docs.filter((doc) => !removed.has(doc.id));

    if (remaining.length > 0) {
      break;
    }

    emptied.push(parentRef);
    removed.add(parentId);
    parentId = String(parent.data()?.['parentReviewId'] ?? '');
  }

  return emptied;
};

export const deleteReviewForUser = async (
  db: Firestore,
  uid: string,
  data: DeleteReviewRequest,
): Promise<DeleteReviewResponse> => {
  const reviewId = idOf(data.reviewId);
  const reference = db.collection(REVIEWS_COLLECTION).doc(reviewId);

  const result = await db.runTransaction(async (transaction) => {
    const read: Reader = {
      doc: (ref) => transaction.get(ref),
      query: (query) => transaction.get(query),
    };
    const stored = await read.doc(reference);

    if (!stored.exists) {
      throw new HttpsError('not-found', 'No review found.');
    }

    // A tombstone has no `authorId`, so nobody passes this for one.
    if (stored.data()?.['authorId'] !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Only the author can delete a review.',
      );
    }

    const replies = await read.query(repliesTo(db, reviewId).limit(1));

    if (!replies.empty) {
      transaction.update(reference, tombstoneUpdate(new Date()));

      // A hidden item's kept text goes with it (issue #2118). A deleted
      // document's copy is removed by `deleteHiddenReviewOnReviewDelete`; a
      // tombstone is an update, which that trigger never sees.
      if (isHidden(stored.data())) {
        transaction.delete(hiddenReviewRef(db, reviewId));
      }

      return { status: 'tombstoned' as const, prunedTombstones: 0 };
    }

    const emptied = await tombstonesLeftEmpty(
      read,
      db,
      stored.data()?.['parentReviewId'],
      new Set([reviewId]),
    );

    transaction.delete(reference);
    emptied.forEach((ref) => transaction.delete(ref));

    return { status: 'deleted' as const, prunedTombstones: emptied.length };
  });

  logger.info('deleteReview: review removed', {
    uid,
    reviewId,
    status: result.status,
    prunedTombstones: result.prunedTombstones,
  });

  return { status: result.status };
};

/**
 * Removes every review and reply an account wrote, for `deleteOwnAccount`.
 *
 * An item that still holds up a reply by somebody else - directly, or through
 * a reply of the account's own that is itself answered - becomes a tombstone,
 * which carries neither the name nor the uid and so does not outlive the
 * account in any form that identifies it. Everything else is deleted, along
 * with any tombstone above it that is left holding nothing up.
 *
 * Answers the number of reviews the account had, deleted and tombstoned alike.
 */
export const removeReviewsByAuthor = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const own = await db
    .collection(REVIEWS_COLLECTION)
    .where('authorId', '==', uid)
    .get();

  if (own.empty) {
    return 0;
  }

  const ownIds = new Set(own.docs.map((doc) => doc.id));
  const repliesById = new Map<string, string[]>();

  for (const doc of own.docs) {
    const replies = await repliesTo(db, doc.id).get();

    repliesById.set(
      doc.id,
      replies.docs.map((reply) => reply.id),
    );
  }

  // An item is kept when any reply under it is somebody else's, or is the
  // account's own and kept itself. Replies always point at an older review,
  // so the walk ends.
  const kept = new Map<string, boolean>();
  const isKept = (reviewId: string): boolean => {
    const known = kept.get(reviewId);

    if (known !== undefined) {
      return known;
    }

    const result = (repliesById.get(reviewId) ?? []).some(
      (replyId) => !ownIds.has(replyId) || isKept(replyId),
    );

    kept.set(reviewId, result);

    return result;
  };

  const now = new Date();
  const removed = new Set(
    own.docs.filter((doc) => !isKept(doc.id)).map((doc) => doc.id),
  );
  const toTombstone = own.docs.filter((doc) => isKept(doc.id));
  const toDelete = own.docs.filter((doc) => removed.has(doc.id));
  const emptied: DocumentReference[] = [];

  for (const doc of toDelete) {
    emptied.push(
      ...(await tombstonesLeftEmpty(
        directReader,
        db,
        doc.data()['parentReviewId'],
        removed,
      )),
    );
  }

  const writes: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [
    ...toTombstone.map(
      (doc) => (batch: FirebaseFirestore.WriteBatch) =>
        batch.update(doc.ref, tombstoneUpdate(now)),
    ),
    ...[...toDelete.map((doc) => doc.ref), ...emptied].map(
      (ref) => (batch: FirebaseFirestore.WriteBatch) => batch.delete(ref),
    ),
  ];

  for (let index = 0; index < writes.length; index += WRITE_BATCH_LIMIT) {
    const batch = db.batch();

    writes
      .slice(index, index + WRITE_BATCH_LIMIT)
      .forEach((write) => write(batch));
    await batch.commit();
  }

  return own.size;
};

export const deleteReviewHandler = async (
  request: CallableRequest<DeleteReviewRequest>,
): Promise<DeleteReviewResponse> => {
  requireMember(request, 'You must be signed in to delete a review.');

  return deleteReviewForUser(
    getFirestore(),
    request.auth.uid,
    request.data ?? {},
  );
};

export const deleteReview = onAppCheck<
  DeleteReviewRequest,
  Promise<DeleteReviewResponse>
>({ timeoutSeconds: 30 }, deleteReviewHandler);
