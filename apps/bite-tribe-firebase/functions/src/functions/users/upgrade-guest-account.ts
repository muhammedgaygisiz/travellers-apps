import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { buildNewUserProfile } from './new-user-profile';

const USERS_COLLECTION = 'users';

export interface UpgradeGuestAccountResult {
  /** Whether this call is what wrote the profile. */
  created: boolean;
}

/**
 * Gives a table guest who just registered the `/users` document a member has
 * (GitHub issue #1657).
 *
 * A guest at a table holds an anonymous account, and registering during the
 * meal *links* a provider onto it rather than creating a new account - which is
 * the whole point, because the session, the orders and the visit are filed
 * under that uid. The cost of linking is that `createUserOnAuthCreate` never
 * runs: it is a `beforeUserCreated` blocking trigger and the account already
 * exists. Without this callable a guest who registers is a member everywhere
 * except in the collection every count, every search and every follower list
 * reads.
 *
 * **It reads the account from the Admin SDK rather than from the caller's
 * token**, and that is the load-bearing decision. A token minted before the
 * link still says `anonymous` until it refreshes (`RD-TS-40`), so a check on
 * `request.auth.token` would refuse the very caller this exists for - and the
 * refresh is a client-side step this callable must not depend on having
 * happened. `getUser()` answers what Firebase Auth actually holds.
 *
 * **Idempotent, and deliberately not an upsert.** A profile that already exists
 * is left exactly as it is: a guest who registers, sets a display name and then
 * hits a retry must not have that name written back to the empty string. The
 * answer says which of the two happened so the client can tell a fresh member
 * from a repeat call.
 *
 * `anySession` rather than `member` (`RD-TS-38`): the caller is by definition a
 * session that was anonymous a moment ago, and the account it acts on is its
 * own uid and nothing else - the callable takes no argument at all.
 */
export const upgradeGuestAccountForUser = async (
  uid: string,
): Promise<UpgradeGuestAccountResult> => {
  const user = await getAuth().getUser(uid);

  if (user.providerData.length === 0) {
    // Still a bare anonymous account. Writing a profile for one would put a
    // member with no name and no email into `/users` for every scan, which is
    // what `createUserOnAuthCreate` skips anonymous sign-ups to avoid.
    throw new HttpsError(
      'failed-precondition',
      'This account has no sign-in method linked to it yet.',
    );
  }

  const profileRef = getFirestore().collection(USERS_COLLECTION).doc(uid);

  if ((await profileRef.get()).exists) {
    return { created: false };
  }

  await profileRef.set(buildNewUserProfile(user, new Date()));

  return { created: true };
};

export const upgradeGuestAccountHandler = async (
  request: CallableRequest<void>,
): Promise<UpgradeGuestAccountResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to finish creating your account.',
    );
  }

  return upgradeGuestAccountForUser(request.auth.uid);
};

export const upgradeGuestAccount = onAppCheck<void>(upgradeGuestAccountHandler);
