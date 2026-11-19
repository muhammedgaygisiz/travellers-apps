import { HttpsError } from 'firebase-functions/https';

/**
 * A request to follow a private profile (GitHub issue #2163, epic #2144).
 *
 * ```text
 * /followRequests/{ownerUid}_{requesterUid}
 * ```
 *
 * One top-level document per pair, outside both follow subcollections, so no
 * reader of `followers` or `following` mistakes a request for a follow and the
 * four follow-count triggers never count one. Named by the pair, so a second
 * request from the same account lands on the document the first one wrote.
 *
 * Written only by the callables in `request-follow.ts` and
 * `answer-follow-request.ts`, and removed by `blockUser` and
 * `deleteOwnAccount`, all through the Admin SDK. `firestore.rules` lets its two
 * parties read it and nobody write it.
 *
 * Repeated in `libs/bite-tribe-common/model/src/lib/follow-request.ts`,
 * because the Functions project cannot reach a library (see `shared/roles.ts`).
 * The two have to be changed together.
 */
export const FOLLOW_REQUESTS_COLLECTION = 'followRequests';

export interface FollowRequest {
  /** The private profile the request is addressed to. */
  ownerUid: string;
  /** The account asking to follow it. */
  requesterUid: string;
  /** ISO 8601, when the request was made. */
  createdAt: string;
}

/** The document id of the request `requesterUid` sent to `ownerUid`. */
export const followRequestId = (
  ownerUid: string,
  requesterUid: string,
): string => `${ownerUid}_${requesterUid}`;

/** What each of the four follow-request callables takes. */
export interface FollowRequestCallData {
  userId?: unknown;
}

/**
 * The other party of the request a callable acts on: the owner for the
 * requester's two callables, the requester for the owner's two. The caller's
 * own uid is refused, because a request between an account and itself can
 * neither exist nor mean anything.
 */
export const counterpartUidOf = (
  data: FollowRequestCallData | undefined,
  ownUid: string,
): string => {
  const userId = typeof data?.userId === 'string' ? data.userId.trim() : '';

  if (!userId) {
    throw new HttpsError('invalid-argument', 'userId is required.');
  }

  if (userId === ownUid) {
    throw new HttpsError(
      'invalid-argument',
      'A follow request needs another account.',
    );
  }

  return userId;
};
