import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  DISPLAY_NAMES_COLLECTION,
  USERS_COLLECTION,
  isValidNormalizedDisplayName,
  normalizeDisplayName,
} from './display-name-utils';

interface ClaimDisplayNameRequest {
  displayName?: unknown;
}

export interface ClaimDisplayNameResult {
  displayName: string;
  normalizedDisplayName: string;
}

const getStoredString = (
  data: admin.firestore.DocumentData | undefined,
  field: string,
): string =>
  data && typeof data[field] === 'string' ? (data[field] as string) : '';

/**
 * Atomically claims a normalized display name for the calling user.
 *
 * The claim lives in `/displayNames/{normalizedName}` and is written inside a
 * transaction so two users can never take the same normalized name
 * concurrently. Renaming releases the caller's previous claim and takes the new
 * one in the same transaction, and the caller's `/users/{uid}` document is kept
 * in sync so the stored display name and its claim stay consistent.
 */
export const claimDisplayNameForUser = async (
  uid: string,
  requestedDisplayName: string,
): Promise<ClaimDisplayNameResult> => {
  const displayName = requestedDisplayName.trim();
  const normalizedDisplayName = normalizeDisplayName(requestedDisplayName);

  if (!isValidNormalizedDisplayName(normalizedDisplayName)) {
    throw new HttpsError('invalid-argument', 'invalid_display_name');
  }

  const db = admin.firestore();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const newClaimRef = db
    .collection(DISPLAY_NAMES_COLLECTION)
    .doc(normalizedDisplayName);

  const result = await db.runTransaction<ClaimDisplayNameResult>(
    async (transaction) => {
      const [
        userSnapshot,
        newClaimSnapshot,
        normalizedUserSnapshot,
        exactUserSnapshot,
      ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(newClaimRef),
        transaction.get(
          db
            .collection(USERS_COLLECTION)
            .where('normalizedDisplayName', '==', normalizedDisplayName)
            .limit(2),
        ),
        transaction.get(
          db
            .collection(USERS_COLLECTION)
            .where('displayName', '==', displayName)
            .limit(2),
        ),
      ]);

      const currentDisplayName = getStoredString(
        userSnapshot.data(),
        'displayName',
      );
      const previousNormalized = normalizeDisplayName(currentDisplayName);

      if (
        newClaimSnapshot.exists &&
        getStoredString(newClaimSnapshot.data(), 'userId') !== uid
      ) {
        throw new HttpsError('already-exists', 'display_name_taken');
      }

      const legacyOwnedByOtherUser = [
        ...normalizedUserSnapshot.docs,
        ...exactUserSnapshot.docs,
      ].some((userDoc) => userDoc.id !== uid);

      if (legacyOwnedByOtherUser) {
        throw new HttpsError('already-exists', 'display_name_taken');
      }

      // Read the previous claim (if the name actually changes) before any write,
      // because a Firestore transaction forbids reads after writes.
      const previousClaimRef =
        previousNormalized && previousNormalized !== normalizedDisplayName
          ? db.collection(DISPLAY_NAMES_COLLECTION).doc(previousNormalized)
          : undefined;
      const previousClaimSnapshot = previousClaimRef
        ? await transaction.get(previousClaimRef)
        : undefined;

      const now = new Date();
      const nowIso = now.toISOString();
      const nowTimestamp = now.getTime();

      transaction.set(
        newClaimRef,
        {
          userId: uid,
          displayName,
          normalizedDisplayName,
          createdAt: newClaimSnapshot.exists
            ? getStoredString(newClaimSnapshot.data(), 'createdAt') || nowIso
            : nowIso,
          createdAtTimestamp: newClaimSnapshot.exists
            ? (newClaimSnapshot.data()?.['createdAtTimestamp'] ?? nowTimestamp)
            : nowTimestamp,
          updatedAt: nowIso,
          updatedAtTimestamp: nowTimestamp,
        },
        { merge: true },
      );

      if (
        previousClaimRef &&
        previousClaimSnapshot?.exists &&
        getStoredString(previousClaimSnapshot.data(), 'userId') === uid
      ) {
        transaction.delete(previousClaimRef);
      }

      transaction.set(
        userRef,
        {
          displayName,
          normalizedDisplayName,
          updatedAt: nowIso,
          updatedAtTimestamp: nowTimestamp,
        },
        { merge: true },
      );

      return { displayName, normalizedDisplayName };
    },
  );

  logger.info('display name claimed', {
    uid,
    normalizedDisplayName: result.normalizedDisplayName,
  });

  return result;
};

export const claimDisplayNameHandler = async (
  request: CallableRequest<ClaimDisplayNameRequest>,
): Promise<ClaimDisplayNameResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to claim a display name.',
    );
  }

  if (typeof request.data?.displayName !== 'string') {
    throw new HttpsError('invalid-argument', 'invalid_display_name');
  }

  return claimDisplayNameForUser(request.auth.uid, request.data.displayName);
};

export const claimDisplayName = onAppCheck<ClaimDisplayNameRequest>(
  claimDisplayNameHandler,
);
