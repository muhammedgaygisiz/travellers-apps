import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { checkContent } from '../shared/moderation/check-content';
import { recordContentRefusal } from '../shared/moderation/content-refusal';
import { isTombstone } from './delete-review';
import { isHidden } from './hidden-review';

/**
 * Reviews and replies are written here rather than by the app (issue #1610),
 * so their text is checked before any other account can read it. The rules
 * refuse every client create and author edit of a review; this callable and
 * {@link editReview} are the way in, and `deleteReview` the way out.
 *
 * A refusal is an answer rather than an error, so the app can tell the user
 * what happened instead of reporting a failed save.
 */

const BITES_COLLECTION = 'bites';
const REVIEWS_COLLECTION = 'reviews';
const USERS_COLLECTION = 'users';

/** The longest review or reply, in characters. Longer text is refused. */
export const MAX_REVIEW_LENGTH = 2000;

export interface SaveReviewRequest {
  biteId?: unknown;
  review?: unknown;
  /** Set together with `threadId` for a reply (issue #1283). */
  parentReviewId?: unknown;
  threadId?: unknown;
}

export interface EditReviewRequest {
  reviewId?: unknown;
  review?: unknown;
}

export type SaveReviewResponse =
  { status: 'saved'; reviewId: string } | { status: 'refused' };

const idOf = (value: unknown, name: string): string => {
  const id = typeof value === 'string' ? value.trim() : '';

  if (!id || id.includes('/')) {
    throw new HttpsError('invalid-argument', `${name} is required.`);
  }

  return id;
};

/** The text as the old rules required it: a string with something in it. */
export const reviewTextOf = (value: unknown): string => {
  if (typeof value !== 'string' || !/\S/.test(value)) {
    throw new HttpsError('invalid-argument', 'review is required.');
  }

  if (value.length > MAX_REVIEW_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `review must be at most ${MAX_REVIEW_LENGTH} characters.`,
    );
  }

  return value;
};

/**
 * The name a review is written under: the author's profile display name, as
 * the app wrote it before (issue #1308), never the sign-in provider's name.
 */
const authorNameOf = async (db: Firestore, uid: string): Promise<string> => {
  const user = await db.collection(USERS_COLLECTION).doc(uid).get();
  const displayName = user.data()?.['displayName'];

  return typeof displayName === 'string' ? displayName.trim() : '';
};

/**
 * A reply needs something to answer: a review that exists and has not been
 * withdrawn. A tombstone (issue #2116) holds the replies already under it up,
 * and takes no new ones.
 */
const requireAnswerable = async (
  db: Firestore,
  parentReviewId: string,
): Promise<void> => {
  const parent = await db
    .collection(REVIEWS_COLLECTION)
    .doc(parentReviewId)
    .get();

  if (!parent.exists) {
    throw new HttpsError('not-found', 'No review found to reply to.');
  }

  if (isTombstone(parent.data())) {
    throw new HttpsError(
      'failed-precondition',
      'A deleted review cannot be answered.',
    );
  }

  // A hidden item (issue #2118) keeps the replies it had and takes no more:
  // a reply to text nobody can read starts a conversation about nothing.
  if (isHidden(parent.data())) {
    throw new HttpsError(
      'failed-precondition',
      'A hidden review cannot be answered.',
    );
  }
};

export const saveReviewForUser = async (
  db: Firestore,
  uid: string,
  data: SaveReviewRequest,
): Promise<SaveReviewResponse> => {
  const biteId = idOf(data.biteId, 'biteId');
  const review = reviewTextOf(data.review);
  const isReply = data.parentReviewId !== undefined;
  const parentReviewId = isReply
    ? idOf(data.parentReviewId, 'parentReviewId')
    : undefined;
  const threadId = isReply ? idOf(data.threadId, 'threadId') : undefined;

  if (!(await db.collection(BITES_COLLECTION).doc(biteId).get()).exists) {
    throw new HttpsError('not-found', 'No Bite found for this review.');
  }

  if (parentReviewId) {
    await requireAnswerable(db, parentReviewId);
  }

  const verdict = await checkContent(db, [{ field: 'review', value: review }]);

  if (verdict.verdict === 'refused') {
    recordContentRefusal({
      uid,
      surface: isReply ? 'reviewReply' : 'review',
      stage: 'callable',
      targetId: biteId,
      verdict,
      text: review,
    });

    return { status: 'refused' };
  }

  const now = new Date();
  const reference = await db.collection(REVIEWS_COLLECTION).add({
    review,
    biteId: `/${BITES_COLLECTION}/${biteId}`,
    ...(isReply ? { parentReviewId, threadId } : {}),
    createdAt: now.toISOString(),
    createdAtTimestamp: now.getTime(),
    authorId: uid,
    author: await authorNameOf(db, uid),
  });

  logger.info('saveReview: review saved', {
    uid,
    biteId,
    reviewId: reference.id,
    isReply,
  });

  return { status: 'saved', reviewId: reference.id };
};

/**
 * Replaces the text of the caller's own review or reply (issue #721), and
 * nothing else: everything that places the review is fixed at creation.
 */
export const editReviewForUser = async (
  db: Firestore,
  uid: string,
  data: EditReviewRequest,
): Promise<SaveReviewResponse> => {
  const reviewId = idOf(data.reviewId, 'reviewId');
  const review = reviewTextOf(data.review);
  const reference = db.collection(REVIEWS_COLLECTION).doc(reviewId);
  const stored = await reference.get();

  if (!stored.exists) {
    throw new HttpsError('not-found', 'No review found.');
  }

  if (stored.data()?.['authorId'] !== uid) {
    throw new HttpsError(
      'permission-denied',
      'Only the author can edit a review.',
    );
  }

  // Editing would put text back on a document an operator took it off
  // (issue #2118).
  if (isHidden(stored.data())) {
    throw new HttpsError(
      'failed-precondition',
      'A hidden review cannot be edited.',
    );
  }

  const verdict = await checkContent(db, [{ field: 'review', value: review }]);

  if (verdict.verdict === 'refused') {
    recordContentRefusal({
      uid,
      surface: stored.data()?.['parentReviewId'] ? 'reviewReply' : 'review',
      stage: 'callable',
      targetId: reviewId,
      verdict,
      text: review,
    });

    return { status: 'refused' };
  }

  const now = new Date();

  await reference.update({
    review,
    updatedAt: now.toISOString(),
    updatedAtTimestamp: now.getTime(),
  });

  return { status: 'saved', reviewId };
};

export const saveReviewHandler = async (
  request: CallableRequest<SaveReviewRequest>,
): Promise<SaveReviewResponse> => {
  requireMember(request, 'You must be signed in to write a review.');

  return saveReviewForUser(
    getFirestore(),
    request.auth.uid,
    request.data ?? {},
  );
};

export const editReviewHandler = async (
  request: CallableRequest<EditReviewRequest>,
): Promise<SaveReviewResponse> => {
  requireMember(request, 'You must be signed in to edit a review.');

  return editReviewForUser(
    getFirestore(),
    request.auth.uid,
    request.data ?? {},
  );
};

export const saveReview = onAppCheck<
  SaveReviewRequest,
  Promise<SaveReviewResponse>
>({ timeoutSeconds: 30 }, saveReviewHandler);

export const editReview = onAppCheck<
  EditReviewRequest,
  Promise<SaveReviewResponse>
>({ timeoutSeconds: 30 }, editReviewHandler);
