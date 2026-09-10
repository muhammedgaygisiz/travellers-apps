import { getAuth } from 'firebase-admin/auth';
import { HttpsError } from 'firebase-functions/https';

/**
 * The account a privileged callable is acting *on*, as opposed to the caller.
 *
 * Two callables resolve it the same way and for the same reason: whoever is
 * doing the granting was told an email address, not a Firebase uid. An operator
 * has the restaurant's address from the phone call that preceded the grant
 * (`setUserRoles`, issue #1469), and a restaurant has its new waiter's address
 * from the person standing in front of them (`addRestaurantStaff`, issue
 * #1537).
 *
 * `uid` wins when both are given, because it is the unambiguous one.
 */
export interface TargetUserRequest {
  uid?: unknown;
  email?: unknown;
}

const getString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

/**
 * Resolves the target account, or rejects.
 *
 * `not-found` does tell the caller that no BiteTribe account holds an address
 * they typed, which is account enumeration by a caller who is already trusted
 * with granting a role. It stays, because the alternative is a grant that
 * silently does nothing when an address is mistyped — the failure mode of a
 * surface whose whole job is "put this person on my restaurant". Both callables
 * are behind a role gate and App Check, so the enumeration is available to
 * operators and restaurant owners rather than to the internet.
 */
export const resolveTargetUid = async (
  data: TargetUserRequest,
): Promise<string> => {
  const uid = getString(data.uid);

  if (uid) {
    return uid;
  }

  const email = getString(data.email);

  if (!email) {
    throw new HttpsError(
      'invalid-argument',
      'Either uid or email is required.',
    );
  }

  try {
    return (await getAuth().getUserByEmail(email)).uid;
  } catch {
    throw new HttpsError('not-found', `No account found for ${email}.`);
  }
};
