import { buildEmailVerificationMetadata } from './email-verification-utils';

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

const getPhotoUrl = (user: ProfileSourceUser): string => {
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
  photoUrl: getPhotoUrl(user),
  countryCodes: [],
  public: false,
  subscriptionTier: 0,
  ...buildEmailVerificationMetadata(user),
  createdAt: now.toISOString(),
  createdAtTimestamp: now.getTime(),
});
