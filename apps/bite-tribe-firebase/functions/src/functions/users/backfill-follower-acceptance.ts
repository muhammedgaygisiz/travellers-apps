import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import { USERS_COLLECTION } from '../shared/utils/user-blocks';
import { isPublicProfile, stampFollowersAsAccepted } from './follow-visibility';

export interface BackfillFollowerAcceptanceResult {
  /** Every user document the migration looked at. */
  processed: number;
  /** Of those, the private profiles whose followers it walked. */
  private: number;
  /** Followers that gained `acceptedAt`, across every private profile. */
  stamped: number;
}

/**
 * Stamps `acceptedAt` on every follower edge of every private profile (GitHub
 * issue #2168), so the followers a profile had before epic #2144 count as
 * accepted - the same stamping `applyFollowVisibilityOnUserUpdate` runs when a
 * profile turns private.
 *
 * Profiles that turned private before that trigger existed never had it run,
 * and the new-Bite push of a private author reaches only stamped followers.
 * An edge that already carries `acceptedAt` is left alone, so a second run
 * writes nothing.
 */
export const backfillFollowerAcceptance = async (
  db: Firestore,
  now: Date = new Date(),
): Promise<BackfillFollowerAcceptanceResult> => {
  const users = await db.collection(USERS_COLLECTION).get();
  const privateUids = users.docs
    .filter((doc) => !isPublicProfile(doc.data()))
    .map((doc) => doc.id);
  let stamped = 0;

  for (const uid of privateUids) {
    stamped += await stampFollowersAsAccepted(db, uid, now);
  }

  return { processed: users.size, private: privateUids.length, stamped };
};

export const backfillFollowerAcceptanceHandler = async (
  request: CallableRequest<void>,
): Promise<BackfillFollowerAcceptanceResult> => {
  requireAdmin(request);

  logOperatorAction(request, {
    action: 'backfillFollowerAcceptance',
    targetType: 'user',
    outcome: 'started',
  });

  const result = await backfillFollowerAcceptance(getFirestore());

  logOperatorAction(request, {
    action: 'backfillFollowerAcceptance',
    targetType: 'user',
    outcome: 'succeeded',
    details: { ...result },
  });

  return result;
};

export const backfillFollowerAcceptanceCallable = onAppCheck<void>(
  backfillFollowerAcceptanceHandler,
);
