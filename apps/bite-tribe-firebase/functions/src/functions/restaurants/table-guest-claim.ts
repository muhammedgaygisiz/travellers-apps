import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { ROLES_CLAIM, TABLE_GUEST_ROLE } from '../shared/roles';

/**
 * Writes the `tableGuest` role onto the anonymous account a scan just admitted
 * (GitHub issue #1629).
 *
 * Kept out of `shared/roles.ts` deliberately: that module is imported by every
 * operator callable and `callable-authorization.spec.ts` asserts it stays free
 * of the Firebase Admin SDK, because `firebase-admin/auth` pulls in `jose` and
 * a spec that reaches it has to mock the SDK to parse at all. The writer lives
 * beside its caller, exactly as `users/set-user-roles.ts` does.
 *
 * **Best effort, and never in the caller's way.** The claim grants nothing -
 * every gate reads the sign-in provider rather than this (`RD-TS-40`) - so a
 * guest whose claim could not be written still scans, still orders, and is
 * still refused everywhere a member is required. Failing their scan over a
 * label would be trading the meal for the paperwork.
 */
export const markTableGuest = async (uid: string): Promise<void> => {
  try {
    await getAuth().setCustomUserClaims(uid, {
      [ROLES_CLAIM]: [TABLE_GUEST_ROLE],
    });
  } catch (error) {
    logger.warn('startTableSession: the table guest claim was not written', {
      uid,
      error,
    });
  }
};
