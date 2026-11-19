import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { blocksEitherWay, USERS_COLLECTION } from '../shared/utils/user-blocks';
import {
  counterpartUidOf,
  FOLLOW_REQUESTS_COLLECTION,
  FollowRequest,
  FollowRequestCallData,
  followRequestId,
} from './follow-request';

const FOLLOWERS_SUBCOLLECTION = 'followers';

export interface RequestFollowResult {
  requested: boolean;
}

export interface WithdrawFollowRequestResult {
  withdrawn: boolean;
}

/**
 * Stores a request from `requesterUid` to follow the private profile of
 * `ownerUid`, and writes neither follow edge (GitHub issue #2163).
 *
 * Refused for an account that does not exist, a public profile (followed
 * directly, as it always was), a pair where either account blocks the other,
 * and a pair that already follows. A second request for the same pair leaves
 * the first one as it is and answers `requested: false`.
 *
 * The block is read before the transaction rather than inside it: a block
 * placed in between is the case `blockUser` covers, since it deletes the
 * request in either direction.
 */
export const requestFollowForCaller = async (
  db: Firestore,
  requesterUid: string,
  ownerUid: string,
  now: Date = new Date(),
): Promise<RequestFollowResult> => {
  const ownerRef = db.collection(USERS_COLLECTION).doc(ownerUid);
  const edgeRef = ownerRef
    .collection(FOLLOWERS_SUBCOLLECTION)
    .doc(requesterUid);
  const requestRef = db
    .collection(FOLLOW_REQUESTS_COLLECTION)
    .doc(followRequestId(ownerUid, requesterUid));

  if (await blocksEitherWay(db, requesterUid, ownerUid)) {
    throw new HttpsError(
      'permission-denied',
      'This account cannot be followed.',
    );
  }

  return db.runTransaction(async (transaction) => {
    const [owner, edge, existing] = await Promise.all([
      transaction.get(ownerRef),
      transaction.get(edgeRef),
      transaction.get(requestRef),
    ]);

    if (!owner.exists) {
      throw new HttpsError('not-found', 'No such user.');
    }

    if (owner.data()?.['public'] === true) {
      throw new HttpsError(
        'failed-precondition',
        'A public profile is followed directly.',
      );
    }

    if (edge.exists) {
      throw new HttpsError(
        'already-exists',
        'You already follow this account.',
      );
    }

    if (existing.exists) {
      return { requested: false };
    }

    const followRequest: FollowRequest = {
      ownerUid,
      requesterUid,
      createdAt: now.toISOString(),
    };

    transaction.set(requestRef, followRequest);

    return { requested: true };
  });
};

/**
 * Deletes the caller's request to `ownerUid`. Withdrawing a request that is
 * not there is not an error: the button that sends this may be a tap behind
 * an owner who already answered.
 */
export const withdrawFollowRequestForCaller = async (
  db: Firestore,
  requesterUid: string,
  ownerUid: string,
): Promise<WithdrawFollowRequestResult> => {
  const requestRef = db
    .collection(FOLLOW_REQUESTS_COLLECTION)
    .doc(followRequestId(ownerUid, requesterUid));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(requestRef);

    if (!existing.exists) {
      return { withdrawn: false };
    }

    transaction.delete(requestRef);

    return { withdrawn: true };
  });
};

export const requestFollowHandler = async (
  request: CallableRequest<FollowRequestCallData>,
): Promise<RequestFollowResult> => {
  requireMember(request, 'You must be signed in to follow an account.');

  const ownerUid = counterpartUidOf(request.data, request.auth.uid);
  const result = await requestFollowForCaller(
    getFirestore(),
    request.auth.uid,
    ownerUid,
  );

  logger.info('requestFollow: follow requested', {
    requesterUid: request.auth.uid,
    ownerUid,
    requested: result.requested,
  });

  return result;
};

export const withdrawFollowRequestHandler = async (
  request: CallableRequest<FollowRequestCallData>,
): Promise<WithdrawFollowRequestResult> => {
  requireMember(request, 'You must be signed in to withdraw a follow request.');

  const ownerUid = counterpartUidOf(request.data, request.auth.uid);
  const result = await withdrawFollowRequestForCaller(
    getFirestore(),
    request.auth.uid,
    ownerUid,
  );

  logger.info('withdrawFollowRequest: follow request withdrawn', {
    requesterUid: request.auth.uid,
    ownerUid,
    withdrawn: result.withdrawn,
  });

  return result;
};

/** Asks a private profile's owner to let the caller follow them (issue #2163). */
export const requestFollow =
  onAppCheck<FollowRequestCallData>(requestFollowHandler);

/** Withdraws the caller's pending follow request (issue #2163). */
export const withdrawFollowRequest = onAppCheck<FollowRequestCallData>(
  withdrawFollowRequestHandler,
);
