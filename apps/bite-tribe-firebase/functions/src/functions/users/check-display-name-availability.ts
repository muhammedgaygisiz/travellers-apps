import * as admin from 'firebase-admin';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  DISPLAY_NAMES_COLLECTION,
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
  const normalizedDisplayName = normalizeDisplayName(requestedDisplayName);

  if (!isValidNormalizedDisplayName(normalizedDisplayName)) {
    return { available: false, normalizedDisplayName };
  }

  const claimSnapshot = await admin
    .firestore()
    .collection(DISPLAY_NAMES_COLLECTION)
    .doc(normalizedDisplayName)
    .get();

  const claimedByOtherUser =
    claimSnapshot.exists && claimSnapshot.data()?.['userId'] !== uid;

  return { available: !claimedByOtherUser, normalizedDisplayName };
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
