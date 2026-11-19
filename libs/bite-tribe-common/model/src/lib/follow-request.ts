/**
 * A request to follow a private profile (GitHub issue #2163, epic #2144),
 * stored at `/followRequests/{ownerUid}_{requesterUid}`.
 *
 * Readable by its two parties and written only by the `requestFollow`,
 * `withdrawFollowRequest`, `acceptFollowRequest` and `declineFollowRequest`
 * callables. Repeated in
 * `apps/bite-tribe-firebase/functions/src/functions/users/follow-request.ts`,
 * because the Functions project cannot reach a library; the two have to be
 * changed together.
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

/** What `requestFollow` answers. False when this pair already had a request. */
export interface RequestFollowResult {
  requested: boolean;
}

/** What `withdrawFollowRequest` answers. False when there was nothing to withdraw. */
export interface WithdrawFollowRequestResult {
  withdrawn: boolean;
}

/** What `acceptFollowRequest` answers once both follow edges are written. */
export interface AcceptFollowRequestResult {
  accepted: boolean;
}

/** What `declineFollowRequest` answers. False when there was nothing to decline. */
export interface DeclineFollowRequestResult {
  declined: boolean;
}
