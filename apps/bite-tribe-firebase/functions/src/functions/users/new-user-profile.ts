import type { Firestore } from 'firebase-admin/firestore';
import { buildEmailVerificationMetadata } from './email-verification-utils';

/**
 * Server-only queue of identity-provider avatars waiting to be mirrored and
 * checked (GitHub issue #2140). No client reads or writes it.
 */
export const IDENTITY_AVATARS_COLLECTION = 'identityAvatars';

/**
 * The account a profile is built from, in the shape both writers can supply.
 *
 * `createUserOnAuthCreate` holds an `AuthUserRecord` from a blocking event and
 * `upgradeGuestAccount` holds a `UserRecord` from the Admin SDK. The two types
 * are not the same type, and this is deliberately structural rather than either
 * of them: what a profile is built from is a uid, a name, an email, a photo and
 * the providers attached to the account, and both carry exactly that.
 */
export interface ProfileSourceUser {
  uid: string;
  displayName?: string;
  email?: string;
  emailVerified?: boolean;
  photoURL?: string;
  providerData: Array<{ providerId?: string; photoURL?: string | null }>;
}

/**
 * The avatar the identity provider holds for the account, or `''` when it has
 * none. It is not written onto the profile: see {@link writeNewUserProfile}.
 */
export const identityProviderPhotoUrl = (user: ProfileSourceUser): string => {
  const providerPhotoUrl = user.providerData.find(
    (providerData) => !!providerData.photoURL,
  )?.photoURL;

  return user.photoURL || providerPhotoUrl || '';
};

/**
 * The `/users` document a new BiteTribe account starts life with (GitHub issue
 * #1657).
 *
 * Extracted from `createUserOnAuthCreate` because there are now two ways to
 * become a member and only one of them fires that trigger. A guest who
 * registers at a table is *linked* rather than created - the Firebase account
 * already exists, so `beforeUserCreated` does not fire - and a profile written
 * by hand on that path would drift from this one field by field. The fields
 * that would drift first are the ones nobody notices: `countryCodes: []` is
 * what keeps the first Bite reading as "earned your first country" rather than
 * as a backfill signal (issue #1212), and `subscriptionTier: 0` is what keeps
 * Pro an explicit grant (issue #1127).
 */
export const buildNewUserProfile = (
  user: ProfileSourceUser,
  now: Date,
): Record<string, unknown> => ({
  userId: user.uid,
  displayName: user.displayName || '',
  fullName: user.displayName || '',
  email: user.email || '',
  // Empty until a checked photo lands: the provider's avatar is mirrored and
  // checked like any other upload (GitHub issue #2140).
  photoUrl: '',
  countryCodes: [],
  public: false,
  subscriptionTier: 0,
  ...buildEmailVerificationMetadata(user),
  createdAt: now.toISOString(),
  createdAtTimestamp: now.getTime(),
});

/**
 * Writes a new account's `/users` document, and queues its identity-provider
 * avatar for `mirrorIdentityAvatarOnCreate` (GitHub issue #2140).
 *
 * The avatar used to be written straight into `photoUrl`, where every other
 * account read it without the image check ever seeing it. It now goes into the
 * server-only `identityAvatars` queue instead, and the mirror uploads it to the
 * account's photo folder, where `setUserPhotoUrlOnUpload` checks it as it
 * checks a photo the member chose. A refused avatar leaves the account with no
 * photo. Both are one batch, so a profile never exists without its queued
 * avatar or the other way round.
 */
export const writeNewUserProfile = async (
  db: Firestore,
  user: ProfileSourceUser,
  now: Date,
): Promise<void> => {
  const batch = db.batch();

  batch.set(
    db.collection('users').doc(user.uid),
    buildNewUserProfile(user, now),
  );

  const sourceUrl = identityProviderPhotoUrl(user);

  if (sourceUrl) {
    batch.set(db.collection(IDENTITY_AVATARS_COLLECTION).doc(user.uid), {
      sourceUrl,
      createdAtTimestamp: now.getTime(),
    });
  }

  await batch.commit();
};
