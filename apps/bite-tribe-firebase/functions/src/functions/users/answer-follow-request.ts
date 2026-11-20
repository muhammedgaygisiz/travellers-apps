import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { notifyRequesterOfAcceptedFollowRequest } from '../notifications/notify-on-follow-request';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { USERS_COLLECTION } from '../shared/utils/user-blocks';
import {
  counterpartUidOf,
  FOLLOW_REQUESTS_COLLECTION,
  FollowRequestCallData,
  followRequestId,
} from './follow-request';

const FOLLOWERS_SUBCOLLECTION = 'followers';
const FOLLOWING_SUBCOLLECTION = 'following';

export interface AcceptFollowRequestResult {
  accepted: boolean;
}

export interface DeclineFollowRequestResult {
  declined: boolean;
}

/**
 * Turns the request `requesterUid` sent to `ownerUid` into a follow: deletes
 * the request and writes both follow edges in one transaction (GitHub issue
 * #2163).
 *
 * Each edge carries `acceptedAt` beside the fields `ProfileApiService.follow`
 * writes. It is the marker that a private owner approved this follower, which
 * a client-written edge never has, and which the new-Bite push reads to tell an
 * approved follower from one who followed before epic #2144.
 *
 * The request is looked up under the caller's own uid as its owner, so the
 * caller can only ever accept a request addressed to them. The follow-count
 * triggers fire on the two edges and raise each count by one.
 */
export const acceptFollowRequestForCaller = async (
  db: Firestore,
  ownerUid: string,
  requesterUid: string,
  now: Date = new Date(),
): Promise<AcceptFollowRequestResult> => {
  const users = db.collection(USERS_COLLECTION);
  const requestRef = db
    .collection(FOLLOW_REQUESTS_COLLECTION)
    .doc(followRequestId(ownerUid, requesterUid));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(requestRef);

    if (!existing.exists) {
      throw new HttpsError('not-found', 'No such follow request.');
    }

    const timestamp = now.toISOString();
    const edge = {
      createdAt: timestamp,
      followerUid: requesterUid,
      followedUid: ownerUid,
      acceptedAt: timestamp,
    };

    transaction.delete(requestRef);
    transaction.set(
      users.doc(ownerUid).collection(FOLLOWERS_SUBCOLLECTION).doc(requesterUid),
      edge,
    );
    transaction.set(
      users.doc(requesterUid).collection(FOLLOWING_SUBCOLLECTION).doc(ownerUid),
      edge,
    );

    return { accepted: true };
  });
};

/**
 * Deletes the request `requesterUid` sent to `ownerUid` and writes no edge.
 * Like withdrawing, declining a request that is gone is not an error.
 */
export const declineFollowRequestForCaller = async (
  db: Firestore,
  ownerUid: string,
  requesterUid: string,
): Promise<DeclineFollowRequestResult> => {
  const requestRef = db
    .collection(FOLLOW_REQUESTS_COLLECTION)
    .doc(followRequestId(ownerUid, requesterUid));

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(requestRef);

    if (!existing.exists) {
      return { declined: false };
    }

    transaction.delete(requestRef);

    return { declined: true };
  });
};

export const acceptFollowRequestHandler = async (
  request: CallableRequest<FollowRequestCallData>,
): Promise<AcceptFollowRequestResult> => {
  requireMember(request, 'You must be signed in to accept a follow request.');

  const requesterUid = counterpartUidOf(request.data, request.auth.uid);
  const db = getFirestore();
  const result = await acceptFollowRequestForCaller(
    db,
    request.auth.uid,
    requesterUid,
  );

  logger.info('acceptFollowRequest: follow request accepted', {
    ownerUid: request.auth.uid,
    requesterUid,
  });

  // After the commit, so a request that was not accepted is never announced.
  // The follow stands either way, so a push that fails is logged and the
  // owner's answer is still a success (GitHub issue #2166).
  try {
    await notifyRequesterOfAcceptedFollowRequest(
      db,
      request.auth.uid,
      requesterUid,
    );
  } catch (error) {
    logger.error('acceptFollowRequest: acceptance push failed', {
      ownerUid: request.auth.uid,
      requesterUid,
      error,
    });
  }

  return result;
};

export const declineFollowRequestHandler = async (
  request: CallableRequest<FollowRequestCallData>,
): Promise<DeclineFollowRequestResult> => {
  requireMember(request, 'You must be signed in to decline a follow request.');

  const requesterUid = counterpartUidOf(request.data, request.auth.uid);
  const result = await declineFollowRequestForCaller(
    getFirestore(),
    request.auth.uid,
    requesterUid,
  );

  logger.info('declineFollowRequest: follow request declined', {
    ownerUid: request.auth.uid,
    requesterUid,
    declined: result.declined,
  });

  return result;
};

/** Accepts a request to follow the caller's private profile (issue #2163). */
export const acceptFollowRequest = onAppCheck<FollowRequestCallData>(
  acceptFollowRequestHandler,
);

/** Declines a request to follow the caller's private profile (issue #2163). */
export const declineFollowRequest = onAppCheck<FollowRequestCallData>(
  declineFollowRequestHandler,
);
