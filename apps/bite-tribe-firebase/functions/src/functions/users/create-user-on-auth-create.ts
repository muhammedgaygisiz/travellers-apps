import { getFirestore } from 'firebase-admin/firestore';
import { beforeUserCreated } from 'firebase-functions/v2/identity';
import type {
  AuthBlockingEvent,
  AuthUserRecord,
} from 'firebase-functions/v2/identity';
import { buildEmailVerificationMetadata } from './email-verification-utils';

const USERS_COLLECTION = 'users';

const getPhotoUrl = (user: AuthUserRecord): string => {
  const providerPhotoUrl = user.providerData.find(
    (providerData) => !!providerData.photoURL,
  )?.photoURL;

  return user.photoURL || providerPhotoUrl || '';
};

/**
 * Whether this sign-up is the anonymous one a scanned table code produces
 * (GitHub issue #1101).
 *
 * A guest who scans a QR code at a table signs in anonymously, and that is not
 * a person joining BiteTribe. A `/users` document for one would be a member
 * with no name, no email and no photo in the collection every count, every
 * search and every follower list reads - one per scan, including the scans that
 * are somebody's script.
 *
 * **This is belt and braces.** Anonymous sign-in does not fire
 * `beforeUserCreated` at all, verified against the Auth emulator: an
 * email/password sign-up reaches this function and an anonymous one does not.
 * So a guest leaves no profile behind whether or not this check exists, and
 * what the check buys is that the guarantee survives Firebase starting to
 * deliver the event.
 *
 * **`providerData` is not the signal**, and that is worth saying because it
 * looks like it should be. The event fires *before* the account exists, so
 * `providerData` is empty for every provider, password included - a check on it
 * skips every account rather than only the anonymous ones, which is the bug the
 * consumer end-to-end suite caught on the first run of this issue. `email` is
 * not the signal either: an account created with a phone number has none and is
 * a member.
 *
 * `additionalUserInfo.providerId` is, with the event type as a second reading of
 * the same fact. Both are **positive** identifications, so an absent field
 * writes the profile: the worst this can now do is give a guest a profile they
 * did not ask for, rather than deny a member the one they did.
 */
const isAnonymousSignUp = (event: AuthBlockingEvent): boolean =>
  event.additionalUserInfo?.providerId === 'anonymous' ||
  event.eventType?.endsWith(':anonymous') === true;

export const createUserOnAuthCreate = beforeUserCreated(async (event) => {
  const user = event.data;

  if (!user?.uid || isAnonymousSignUp(event)) {
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
