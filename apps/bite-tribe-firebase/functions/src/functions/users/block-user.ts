import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import {
  BLOCKED_BY_SUBCOLLECTION,
  BLOCKED_SUBCOLLECTION,
  USERS_COLLECTION,
} from '../shared/utils/user-blocks';

const FOLLOWERS_SUBCOLLECTION = 'followers';
const FOLLOWING_SUBCOLLECTION = 'following';

export interface BlockUserRequest {
  uid?: unknown;
}

export interface BlockUserResult {
  blocked: boolean;
}

/**
 * The account the caller is blocking or unblocking. Blocking oneself is
 * refused rather than stored, because nothing could ever read it back.
 */
const targetUidOf = (request: CallableRequest<BlockUserRequest>): string => {
  const uid =
    typeof request.data?.uid === 'string' ? request.data.uid.trim() : '';

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }

  if (uid === request.auth?.uid) {
    throw new HttpsError('invalid-argument', 'You cannot block yourself.');
  }

  return uid;
};

/**
 * Writes both sides of the block and removes the follow relation in both
 * directions, in one batch.
 *
 * The follow removal is why this is a callable rather than a client write: the
 * rules let each account delete only its own follow edges, and the blocked
 * account's `following` entry for the blocker is not the blocker's to delete.
 * Deleting an edge that does not exist is a no-op, and the follow-count
 * triggers fire only for the ones that did, so the counts stay right.
 *
 * Nothing is written anywhere the blocked account reads, and no notification
 * is sent: the block is invisible to them.
 */
export const blockUserForCaller = async (
  db: Firestore,
  blockerUid: string,
  blockedUid: string,
  now: Date = new Date(),
): Promise<void> => {
  const users = db.collection(USERS_COLLECTION);
  const blocker = users.doc(blockerUid);
  const blocked = users.doc(blockedUid);

  if (!(await blocked.get()).exists) {
    throw new HttpsError('not-found', 'No such user.');
  }

  const edge = {
    blockerUid,
    blockedUid,
    createdAt: now.toISOString(),
    createdAtTimestamp: now.getTime(),
  };

  const batch = db.batch();

  batch.set(blocker.collection(BLOCKED_SUBCOLLECTION).doc(blockedUid), edge);
  batch.set(blocked.collection(BLOCKED_BY_SUBCOLLECTION).doc(blockerUid), edge);

  batch.delete(blocker.collection(FOLLOWING_SUBCOLLECTION).doc(blockedUid));
  batch.delete(blocked.collection(FOLLOWERS_SUBCOLLECTION).doc(blockerUid));
  batch.delete(blocked.collection(FOLLOWING_SUBCOLLECTION).doc(blockerUid));
  batch.delete(blocker.collection(FOLLOWERS_SUBCOLLECTION).doc(blockedUid));

  await batch.commit();
};

/**
 * Removes both sides of the block. A follow relation the block removed is not
 * restored: unblocking lifts the boundary, it does not rewind the graph.
 */
export const unblockUserForCaller = async (
  db: Firestore,
  blockerUid: string,
  blockedUid: string,
): Promise<void> => {
  const users = db.collection(USERS_COLLECTION);
  const batch = db.batch();

  batch.delete(
    users.doc(blockerUid).collection(BLOCKED_SUBCOLLECTION).doc(blockedUid),
  );
  batch.delete(
    users.doc(blockedUid).collection(BLOCKED_BY_SUBCOLLECTION).doc(blockerUid),
  );

  await batch.commit();
};

export const blockUserHandler = async (
  request: CallableRequest<BlockUserRequest>,
): Promise<BlockUserResult> => {
  requireMember(request, 'You must be signed in to block an account.');

  const blockedUid = targetUidOf(request);

  await blockUserForCaller(getFirestore(), request.auth.uid, blockedUid);

  logger.info('blockUser: account blocked', {
    blockerUid: request.auth.uid,
    blockedUid,
  });

  return { blocked: true };
};

export const unblockUserHandler = async (
  request: CallableRequest<BlockUserRequest>,
): Promise<BlockUserResult> => {
  requireMember(request, 'You must be signed in to unblock an account.');

  const blockedUid = targetUidOf(request);

  await unblockUserForCaller(getFirestore(), request.auth.uid, blockedUid);

  logger.info('unblockUser: account unblocked', {
    blockerUid: request.auth.uid,
    blockedUid,
  });

  return { blocked: false };
};

/** Blocks another account for the caller (GitHub issue #1609). */
export const blockUser = onAppCheck<BlockUserRequest>(blockUserHandler);

/** Lifts a block the caller placed (GitHub issue #1609). */
export const unblockUser = onAppCheck<BlockUserRequest>(unblockUserHandler);
