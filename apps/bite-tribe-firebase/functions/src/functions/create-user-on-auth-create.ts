import * as admin from 'firebase-admin';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import type { AuthUserRecord } from 'firebase-functions/v2/identity';

const USERS_COLLECTION = 'users';

const getPhotoUrl = (user: AuthUserRecord): string => {
  const providerPhotoUrl = user.providerData.find(
    (providerData) => !!providerData.photoURL,
  )?.photoURL;

  return user.photoURL || providerPhotoUrl || '';
};

export const createUserOnAuthCreate = beforeUserCreated(async (event) => {
  const user = event.data;

  if (!user?.uid) {
    return;
  }

  const now = new Date();

  await admin
    .firestore()
    .collection(USERS_COLLECTION)
    .doc(user.uid)
    .set({
      userId: user.uid,
      displayName: user.displayName || '',
      fullName: user.displayName || '',
      email: user.email || '',
      photoUrl: getPhotoUrl(user),
      public: false,
      subscriptionTier: 1,
      createdAt: now.toISOString(),
      createdAtTimestamp: now.getTime(),
    });
});
