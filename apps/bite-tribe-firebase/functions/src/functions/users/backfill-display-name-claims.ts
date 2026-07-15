import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  DISPLAY_NAMES_COLLECTION,
  USERS_COLLECTION,
  isValidNormalizedDisplayName,
  normalizeDisplayName,
} from './display-name-utils';

export interface BackfillDisplayNameClaimsResult {
  processed: number;
  claimed: number;
  skipped: number;
  collisions: number;
}

interface BackfillCollision {
  userId: string;
  displayName: string;
  normalizedDisplayName: string;
  claimedByUserId: string;
}

const getStoredString = (
  data: admin.firestore.DocumentData | undefined,
  field: string,
): string =>
  data && typeof data[field] === 'string' ? (data[field] as string) : '';

/**
 * One-off migration that claims every existing user's current display name so
 * uniqueness enforcement can be switched on with existing users protected.
 *
 * Users are processed oldest-first (`createdAtTimestamp` ascending) so that on a
 * normalization collision the first-registered user keeps the name (first-come);
 * later colliding users are left unclaimed and must pick a new name in the
 * onboarding assistant. The migration is idempotent: a claim already owned by
 * the user is left untouched.
 */
export const backfillDisplayNameClaims =
  async (): Promise<BackfillDisplayNameClaimsResult> => {
    const db = admin.firestore();
    const usersSnapshot = await db
      .collection(USERS_COLLECTION)
      .orderBy('createdAtTimestamp', 'asc')
      .get();

    let processed = 0;
    let claimed = 0;
    let skipped = 0;
    const collisions: BackfillCollision[] = [];

    for (const userDoc of usersSnapshot.docs) {
      processed++;

      const userId = userDoc.id;
      const displayName = getStoredString(userDoc.data(), 'displayName').trim();
      const normalizedDisplayName = normalizeDisplayName(displayName);

      if (!isValidNormalizedDisplayName(normalizedDisplayName)) {
        skipped++;
        continue;
      }

      const claimRef = db
        .collection(DISPLAY_NAMES_COLLECTION)
        .doc(normalizedDisplayName);

      const outcome = await db.runTransaction<
        'claimed' | 'skipped' | 'collision'
      >(async (transaction) => {
        const claimSnapshot = await transaction.get(claimRef);

        if (claimSnapshot.exists) {
          const claimOwner = getStoredString(claimSnapshot.data(), 'userId');
          if (claimOwner === userId) {
            return 'skipped';
          }

          collisions.push({
            userId,
            displayName,
            normalizedDisplayName,
            claimedByUserId: claimOwner,
          });
          return 'collision';
        }

        const now = new Date();
        transaction.set(claimRef, {
          userId,
          displayName,
          normalizedDisplayName,
          createdAt: now.toISOString(),
          createdAtTimestamp: now.getTime(),
          updatedAt: now.toISOString(),
          updatedAtTimestamp: now.getTime(),
          backfilled: true,
        });

        transaction.set(
          userDoc.ref,
          { normalizedDisplayName },
          { merge: true },
        );

        return 'claimed';
      });

      if (outcome === 'claimed') {
        claimed++;
      } else if (outcome === 'skipped') {
        skipped++;
      }
    }

    if (collisions.length > 0) {
      logger.warn('display name backfill found normalization collisions', {
        collisionCount: collisions.length,
        collisions,
      });
    }

    const result: BackfillDisplayNameClaimsResult = {
      processed,
      claimed,
      skipped,
      collisions: collisions.length,
    };

    logger.info('display name backfill complete', result);

    return result;
  };

export const backfillDisplayNameClaimsHandler = async (
  request: CallableRequest<void>,
): Promise<BackfillDisplayNameClaimsResult> => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to run the display name backfill.',
    );
  }

  logger.info('display name backfill started', {
    requestedBy: request.auth.uid,
  });

  return backfillDisplayNameClaims();
};

export const backfillDisplayNameClaimsCallable = onAppCheck<void>(
  backfillDisplayNameClaimsHandler,
);
