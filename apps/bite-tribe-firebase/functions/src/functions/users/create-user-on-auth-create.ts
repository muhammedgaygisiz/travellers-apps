import { getFirestore } from 'firebase-admin/firestore';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import type { AuthUserRecord } from 'firebase-functions/v2/identity';
import { buildEmailVerificationMetadata } from './email-verification-utils';

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

  await getFirestore()
    .collection(USERS_COLLECTION)
    .doc(user.uid)
    .set({
      userId: user.uid,
      displayName: user.displayName || '',
      fullName: user.displayName || '',
      email: user.email || '',
      photoUrl: getPhotoUrl(user),
      // An empty badge list, not a missing property: the first Bite of a fresh
      // account must read as "earned your first country" rather than as the
      // never-ran-before signal that makes `addCountryCodeToUser` backfill and
      // stay silent (issue #1212).
      countryCodes: [],
      public: false,
      // Free tier. Every new account starts here and Pro is granted only by an
      // explicit entitlement, never by the creation default (issue #1127).
      subscriptionTier: 0,
      ...buildEmailVerificationMetadata(user),
      createdAt: now.toISOString(),
      createdAtTimestamp: now.getTime(),
    });
});
