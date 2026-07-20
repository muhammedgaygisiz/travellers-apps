import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  buildEmailVerificationMetadata,
  EmailVerificationMetadata,
} from './email-verification-utils';

export const syncEmailVerificationStatusForUser = async (
  uid: string,
): Promise<EmailVerificationMetadata> => {
  const authUser = await getAuth().getUser(uid);
  const userReference = getFirestore().collection('users').doc(uid);
  const userSnapshot = await userReference.get();
  const existingData = userSnapshot.data() || {};
  const metadata = buildEmailVerificationMetadata(authUser, existingData);

  await userReference.set(
    {
      email: authUser.email || existingData['email'] || '',
      ...metadata,
    },
    { merge: true },
  );

  return metadata;
};

export const syncEmailVerificationStatus = onAppCheck<
  void,
  Promise<EmailVerificationMetadata>
>(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to sync email verification status.',
    );
  }

  return syncEmailVerificationStatusForUser(request.auth.uid);
});
