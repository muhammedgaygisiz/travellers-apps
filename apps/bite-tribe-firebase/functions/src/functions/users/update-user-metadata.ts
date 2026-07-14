import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';

interface UpdateUserMetadataRequest {
  version?: string;
  buildNumber?: string;
}

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : undefined;
};

export const updateUserMetadata = onAppCheck<UpdateUserMetadataRequest>(
  async (request) => {
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'You must be signed in to update user metadata.',
      );
    }

    const userReference = admin
      .firestore()
      .collection('users')
      .doc(request.auth.uid);
    const userSnapshot = await userReference.get();

    if (!userSnapshot.exists) {
      return;
    }

    const appVersion = toOptionalString(request.data?.version);
    const appBuildNumber = toOptionalString(request.data?.buildNumber);
    const userUpdate: admin.firestore.UpdateData<admin.firestore.DocumentData> =
      {
        lastSeen: new Date().toISOString(),
        lastSeenTimestamp: Date.now(),
      };

    if (appVersion) {
      userUpdate.appVersion = appVersion;
    }

    if (appBuildNumber) {
      userUpdate.appBuildNumber = appBuildNumber;
    }

    await userReference.update(userUpdate);

    return;
  },
);
