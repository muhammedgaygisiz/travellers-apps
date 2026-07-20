import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  DISPLAY_NAMES_COLLECTION,
  USERS_COLLECTION,
  isValidNormalizedDisplayName,
  normalizeDisplayName,
} from './display-name-utils';

interface CheckDisplayNameAvailabilityRequest {
  displayName?: unknown;
}

export interface CheckDisplayNameAvailabilityResult {
  available: boolean;
  normalizedDisplayName: string;
}

/**
 * Read-only availability check for a normalized display name. A name already
 * owned by the calling user counts as available so the live check does not flag
 * a user's own current name. This is the same normalization used by the atomic
 * claim, so a positive result is advisory only until `claimDisplayName` runs.
 */
export const checkDisplayNameAvailabilityForUser = async (
  uid: string,
  requestedDisplayName: string,
): Promise<CheckDisplayNameAvailabilityResult> => {
  const displayName = requestedDisplayName.trim();
  const normalizedDisplayName = normalizeDisplayName(requestedDisplayName);

  if (!isValidNormalizedDisplayName(normalizedDisplayName)) {
    return { available: false, normalizedDisplayName };
  }

  const db = getFirestore();
  const [claimSnapshot, normalizedUserSnapshot, exactUserSnapshot] =
    await Promise.all([
      db.collection(DISPLAY_NAMES_COLLECTION).doc(normalizedDisplayName).get(),
      db
        .collection(USERS_COLLECTION)
        .where('normalizedDisplayName', '==', normalizedDisplayName)
        .limit(2)
        .get(),
      db
        .collection(USERS_COLLECTION)
        .where('displayName', '==', displayName)
        .limit(2)
        .get(),
    ]);

  const claimedByOtherUser =
    claimSnapshot.exists && claimSnapshot.data()?.['userId'] !== uid;
  const legacyOwnedByOtherUser = [
    ...normalizedUserSnapshot.docs,
    ...exactUserSnapshot.docs,
  ].some((userDoc) => userDoc.id !== uid);

  return {
    available: !claimedByOtherUser && !legacyOwnedByOtherUser,
    normalizedDisplayName,
  };
};

export const checkDisplayNameAvailabilityHandler = async (
  request: CallableRequest<CheckDisplayNameAvailabilityRequest>,
): Promise<CheckDisplayNameAvailabilityResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to check display name availability.',
    );
  }

  if (typeof request.data?.displayName !== 'string') {
    throw new HttpsError('invalid-argument', 'invalid_display_name');
  }

  return checkDisplayNameAvailabilityForUser(
    request.auth.uid,
    request.data.displayName,
  );
};

export const checkDisplayNameAvailability =
  onAppCheck<CheckDisplayNameAvailabilityRequest>(
    checkDisplayNameAvailabilityHandler,
  );
