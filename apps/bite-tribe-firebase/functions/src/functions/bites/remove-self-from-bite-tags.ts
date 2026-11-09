import { FieldValue, Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import { TAGGED_USER_IDS_FIELD, taggedUserIdsOf } from './bite-tagged-users';

const BITES_COLLECTION = 'bites';

export interface RemoveSelfFromBiteTagsRequest {
  biteId?: unknown;
}

export interface RemoveSelfFromBiteTagsResult {
  removed: true;
}

const parseBiteId = (value: unknown): string => {
  const biteId = typeof value === 'string' ? value.trim() : '';

  if (!biteId || biteId.includes('/')) {
    throw new HttpsError('invalid-argument', 'biteId is required.');
  }

  return biteId;
};

/**
 * Takes `uid` off one Bite's tagged users, and changes nothing else.
 *
 * Inside a transaction, so the check that the caller is tagged and the
 * removal see the same document. `arrayRemove` names only the caller's uid,
 * so a creator's edit landing alongside keeps everybody else.
 */
export const removeSelfFromBiteTagsForCaller = async (
  db: Firestore,
  uid: string,
  biteId: string,
): Promise<void> => {
  const biteRef = db.collection(BITES_COLLECTION).doc(biteId);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(biteRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'No such Bite.');
    }

    if (!taggedUserIdsOf(snapshot.data()).includes(uid)) {
      throw new HttpsError(
        'failed-precondition',
        'You are not tagged in this Bite.',
      );
    }

    transaction.update(biteRef, {
      [TAGGED_USER_IDS_FIELD]: FieldValue.arrayRemove(uid),
    });
  });
};

export const removeSelfFromBiteTagsHandler = async (
  request: CallableRequest<RemoveSelfFromBiteTagsRequest>,
): Promise<RemoveSelfFromBiteTagsResult> => {
  requireMember(request, 'You must be signed in to remove yourself.');

  const biteId = parseBiteId(request.data?.biteId);

  await removeSelfFromBiteTagsForCaller(
    getFirestore(),
    request.auth.uid,
    biteId,
  );

  logger.info('removeSelfFromBiteTags: tagged user removed', {
    biteId,
    uid: request.auth.uid,
  });

  return { removed: true };
};

/**
 * A tagged user takes themselves off somebody else's Bite (GitHub issue
 * #1920). A callable because only a Bite's owner may update it under the
 * rules; this removes the caller's own uid and nothing else.
 */
export const removeSelfFromBiteTags = onAppCheck<RemoveSelfFromBiteTagsRequest>(
  removeSelfFromBiteTagsHandler,
);
