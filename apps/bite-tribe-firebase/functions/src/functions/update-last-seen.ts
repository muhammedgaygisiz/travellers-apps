import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/https';

export const updateLastSeen = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to update last seen.',
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

  await userReference.update({
    lastSeen: new Date().toISOString(),
    lastSeenTimestamp: Date.now(),
  });

  return;
});
