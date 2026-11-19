import { getAuth } from 'firebase-admin/auth';
import { FieldValue, Firestore, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { isBiteTribeRole, requireAdmin, ROLES_CLAIM } from '../shared/roles';
import { ownerUserIdsOf, RESTAURANT_COLLECTION } from './restaurant-authority';

/**
 * The role an account has to hold before a restaurant can be assigned to it.
 *
 * Checked here rather than left to the caller, because an assignment pointing
 * at an account that cannot act on it is a fact that reads as ownership and
 * behaves as nothing: the business app's routes are gated on `business`, so the
 * owner could not open the restaurant they own.
 */
const OWNER_ROLE = 'business';

/**
 * The most accounts one restaurant can be assigned to (epic #1614).
 *
 * A product limit rather than a technical one, and it can be raised. It keeps
 * the set an operator has to read on the ownership surface short, and it
 * bounds what one restaurant fans a new-order notification out to.
 */
export const MAX_RESTAURANT_OWNERS = 10;

interface AssignRestaurantOwnerRequest {
  restaurantId?: unknown;
  ownerUserId?: unknown;
  reason?: unknown;
}

interface RevokeRestaurantOwnerRequest {
  restaurantId?: unknown;
  ownerUserId?: unknown;
  reason?: unknown;
}

export interface AssignRestaurantOwnerResult {
  restaurantId: string;
  ownerUserId: string;
  /** Every owner of the restaurant after the call. */
  ownerUserIds: string[];
  claimStatus: 'claimed';
  /**
   * `already-assigned` is the idempotent repeat: the restaurant already belongs
   * to this account, so nothing was written and the current state is returned.
   * The same shape `verifyRestaurantCandidate` uses for `already-verified`.
   */
  status: 'assigned' | 'already-assigned';
}

export interface RevokeRestaurantOwnerResult {
  restaurantId: string;
  /**
   * The account that was removed. The document no longer says, and an operator
   * reading back what their click did should not have to find the log entry to
   * know.
   */
  previousOwnerUserId: string;
  /** The owners that remain, empty when the last one was removed. */
  ownerUserIds: string[];
  /** `revoked` only when the last owner was removed. */
  claimStatus: 'claimed' | 'revoked';
}

const parseRequired = (value: unknown, field: string): string => {
  const parsed = typeof value === 'string' ? value.trim() : '';

  if (!parsed) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }

  return parsed;
};

/**
 * Both callables require a reason.
 *
 * Cloud Logging is the only record either one leaves — there is no claim
 * document and none is planned (epic #1471) — so an assignment with no reason
 * is an ownership change nobody can account for six months later. Required
 * rather than optional for the reason `setUserSubscriptionTier` requires one:
 * the field that is optional is the field that is empty.
 */
const parseReason = (value: unknown): string => parseRequired(value, 'reason');

/**
 * Rejects an account that cannot be a restaurant owner.
 *
 * The roles are read from the Auth record rather than from `/users`, because
 * they are custom claims: there is no document that answers "does this account
 * hold `business`", which is the same reason the admin app's account list goes
 * through `listUsersWithRoles` (issue #1469).
 */
const requireBusinessAccount = async (ownerUserId: string): Promise<void> => {
  let claims: Record<string, unknown> | undefined;

  try {
    claims = (await getAuth().getUser(ownerUserId)).customClaims ?? {};
  } catch {
    throw new HttpsError('not-found', `No account found for ${ownerUserId}.`);
  }

  const raw = claims[ROLES_CLAIM];
  const roles = Array.isArray(raw) ? raw.filter(isBiteTribeRole) : [];

  if (!roles.includes(OWNER_ROLE)) {
    throw new HttpsError(
      'failed-precondition',
      `Account ${ownerUserId} does not hold the ${OWNER_ROLE} role.`,
    );
  }
};

/**
 * The write that takes one account off a restaurant's owners.
 *
 * Shared by the operator's revoke and by account deletion (issue #1568), so a
 * restaurant released either way ends in the same state. Other owners keep
 * the restaurant `claimed`. Removing the last owner deletes the set and the
 * grant timestamps and sets `claimStatus: revoked`, which
 * `assignRestaurantOwner` accepts like `unclaimed`.
 */
export const ownerRemovalOf = (
  currentOwners: string[],
  ownerUserId: string,
  now: Date,
): {
  update: Record<string, unknown>;
  ownerUserIds: string[];
  claimStatus: 'claimed' | 'revoked';
} => {
  const ownerUserIds = currentOwners.filter((uid) => uid !== ownerUserId);
  const timestamps = {
    updatedAt: now.toISOString(),
    updatedAtTimestamp: now.getTime(),
  };

  if (ownerUserIds.length > 0) {
    return {
      update: { ownerUserIds, ...timestamps },
      ownerUserIds,
      claimStatus: 'claimed',
    };
  }

  return {
    update: {
      ownerUserIds: FieldValue.delete(),
      claimedAt: FieldValue.delete(),
      claimedAtTimestamp: FieldValue.delete(),
      claimStatus: 'revoked',
      ...timestamps,
    },
    ownerUserIds: [],
    claimStatus: 'revoked',
  };
};

/**
 * Releases every restaurant a deleted account owns (issue #1568).
 *
 * Account deletion cannot be refused, so the restaurants are released rather
 * than kept: no restaurant may go on naming a uid that no longer exists. Each
 * one is its own transaction, so a restaurant an operator revoked in the
 * meantime is skipped rather than written twice. No operator decided this,
 * so it is logged as a deletion step with the restaurants it released,
 * not through the operator log.
 *
 * Returns the number of restaurants released.
 */
export const releaseRestaurantsOwnedBy = async (
  db: Firestore,
  uid: string,
): Promise<number> => {
  const owned = await db
    .collection(RESTAURANT_COLLECTION)
    .where('ownerUserIds', 'array-contains', uid)
    .get();

  const released: { restaurantId: string; claimStatus: string }[] = [];

  for (const doc of owned.docs) {
    const claimStatus = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(doc.ref);
      const currentOwners = ownerUserIdsOf(snapshot.data());

      if (!currentOwners.includes(uid)) {
        return undefined;
      }

      const removal = ownerRemovalOf(currentOwners, uid, new Date());

      transaction.update(doc.ref, removal.update);

      return removal.claimStatus;
    });

    if (claimStatus) {
      released.push({ restaurantId: doc.id, claimStatus });
    }
  }

  if (released.length) {
    logger.info('deleteOwnAccount: released restaurants', { uid, released });
  }

  return released.length;
};

/**
 * Assigns a verified restaurant to a business account.
 *
 * Every document in `/restaurants` is a verified restaurant: an unverified
 * place is a `place` string on a Bite and has no document to assign. So
 * "verified" is the collection, and a restaurant that is not in it is
 * `not-found` rather than refused for being unverified.
 *
 * **It adds an owner; it never replaces one** (epic #1614, issue #1753). A
 * restaurant can be held by up to {@link MAX_RESTAURANT_OWNERS} accounts, each
 * with every right an owner has. Replacing an owner is revoke then assign, so
 * the trail shows two decisions with two reasons instead of one write that
 * quietly removed an accountable party.
 *
 * Repeating the same assignment is idempotent — it returns the current state
 * without writing — which is the rule `verifyRestaurantCandidate` already
 * follows for the other multi-step restaurant workflow.
 *
 * The read and the write are one transaction rather than an `arrayUnion`
 * outside one, so the cap is checked against what is actually committed. Two
 * operators adding two accounts at once both land: Firestore retries the
 * transaction that lost, which then reads the other's write and adds to it.
 *
 * `claimStatus` becomes `claimed`, and the grant timestamps are written only
 * when the set was empty: they say when the restaurant became held, not when
 * each owner joined. That is in the operator log.
 *
 * The assignment is a document field, never a custom claim. It then takes
 * effect immediately rather than after up to an hour of token lifetime, there
 * is no 1000-byte claim payload to grow into, and the ownership-scoped rules of
 * issue #1078 read documents anyway — a claim copy would be a second version of
 * one fact that can disagree with it.
 */
export const assignRestaurantOwnerHandler = async (
  request: CallableRequest<AssignRestaurantOwnerRequest>,
): Promise<AssignRestaurantOwnerResult> => {
  requireAdmin(request);

  const restaurantId = parseRequired(
    request.data?.restaurantId,
    'restaurantId',
  );
  const ownerUserId = parseRequired(request.data?.ownerUserId, 'ownerUserId');
  const reason = parseReason(request.data?.reason);

  await requireBusinessAccount(ownerUserId);

  const db = getFirestore();
  const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc(restaurantId);

  logOperatorAction(request, {
    action: 'assignRestaurantOwner',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'started',
    reason,
    details: { ownerUserId },
  });

  const result = await db.runTransaction<AssignRestaurantOwnerResult>(
    async (transaction) => {
      const snapshot = await transaction.get(restaurantRef);

      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Restaurant was not found.');
      }

      const currentOwners = ownerUserIdsOf(snapshot.data());

      if (currentOwners.includes(ownerUserId)) {
        return {
          restaurantId,
          ownerUserId,
          ownerUserIds: currentOwners,
          claimStatus: 'claimed',
          status: 'already-assigned',
        };
      }

      if (currentOwners.length >= MAX_RESTAURANT_OWNERS) {
        throw new HttpsError(
          'failed-precondition',
          `Restaurant already has ${MAX_RESTAURANT_OWNERS} owners, the most it can have.`,
        );
      }

      const now = new Date();
      const ownerUserIds = [...currentOwners, ownerUserId];

      transaction.update(restaurantRef, {
        ownerUserIds,
        claimStatus: 'claimed',
        ...(currentOwners.length === 0
          ? {
              claimedAt: now.toISOString(),
              claimedAtTimestamp: now.getTime(),
            }
          : {}),
        updatedAt: now.toISOString(),
        updatedAtTimestamp: now.getTime(),
      });

      return {
        restaurantId,
        ownerUserId,
        ownerUserIds,
        claimStatus: 'claimed',
        status: 'assigned',
      };
    },
  );

  logOperatorAction(request, {
    action: 'assignRestaurantOwner',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    reason,
    details: { ownerUserId, status: result.status },
  });

  return result;
};

/**
 * Takes a restaurant back from one of the accounts holding it.
 *
 * It names the account (epic #1614, issue #1753). A restaurant can have
 * several owners, and a revoke that took "the" owner would have to guess which
 * one. The others keep every right they had, and `claimStatus` stays
 * `claimed`.
 *
 * Removing the **last** owner deletes the set and the grant timestamps rather
 * than blanking them, so an unowned restaurant carries no field at all and the
 * "missing means unclaimed" rule on the model stays the only rule a reader
 * needs. `claimStatus` then becomes `revoked` rather than `unclaimed`, because
 * "it was taken away" and "nobody ever had it" are different answers to an
 * operator looking at the restaurant.
 *
 * Revoking an account that does not hold the restaurant is refused, including
 * on a restaurant nobody holds. Writing `revoked` over an `unclaimed`
 * restaurant would record a decision that was never made.
 */
export const revokeRestaurantOwnerHandler = async (
  request: CallableRequest<RevokeRestaurantOwnerRequest>,
): Promise<RevokeRestaurantOwnerResult> => {
  requireAdmin(request);

  const restaurantId = parseRequired(
    request.data?.restaurantId,
    'restaurantId',
  );
  const ownerUserId = parseRequired(request.data?.ownerUserId, 'ownerUserId');
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc(restaurantId);

  logOperatorAction(request, {
    action: 'revokeRestaurantOwner',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'started',
    reason,
    details: { ownerUserId },
  });

  const result = await db.runTransaction<RevokeRestaurantOwnerResult>(
    async (transaction) => {
      const snapshot = await transaction.get(restaurantRef);

      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Restaurant was not found.');
      }

      const currentOwners = ownerUserIdsOf(snapshot.data());

      if (!currentOwners.includes(ownerUserId)) {
        throw new HttpsError(
          'failed-precondition',
          `Restaurant is not assigned to ${ownerUserId}.`,
        );
      }

      const removal = ownerRemovalOf(currentOwners, ownerUserId, new Date());

      transaction.update(restaurantRef, removal.update);

      return {
        restaurantId,
        previousOwnerUserId: ownerUserId,
        ownerUserIds: removal.ownerUserIds,
        claimStatus: removal.claimStatus,
      };
    },
  );

  logOperatorAction(request, {
    action: 'revokeRestaurantOwner',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    reason,
    details: {
      ownerUserId,
      remainingOwnerUserIds: result.ownerUserIds,
      claimStatus: result.claimStatus,
    },
  });

  return result;
};

/**
 * The two halves live in one module because they are one invariant.
 *
 * Who holds a restaurant is decided by the pair: assign adds an account that
 * is not yet an owner, revoke removes one that is, and each is the other's
 * precondition. Split across two files, the two would be free to drift
 * apart on what counts as owned — which field is read, whether an empty string
 * is an owner — and the invariant would live in neither.
 */
export const assignRestaurantOwner = onAppCheck<AssignRestaurantOwnerRequest>(
  assignRestaurantOwnerHandler,
);

export const revokeRestaurantOwner = onAppCheck<RevokeRestaurantOwnerRequest>(
  revokeRestaurantOwnerHandler,
);
