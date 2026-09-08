import { getAuth } from 'firebase-admin/auth';
import {
  DocumentData,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { isBiteTribeRole, requireAdmin, ROLES_CLAIM } from '../shared/roles';

const RESTAURANT_COLLECTION = 'restaurants';

/**
 * The role an account has to hold before a restaurant can be assigned to it.
 *
 * Checked here rather than left to the caller, because an assignment pointing
 * at an account that cannot act on it is a fact that reads as ownership and
 * behaves as nothing: the business app's routes are gated on `business`, so the
 * owner could not open the restaurant they own.
 */
const OWNER_ROLE = 'business';

interface AssignRestaurantOwnerRequest {
  restaurantId?: unknown;
  ownerUserId?: unknown;
  reason?: unknown;
}

interface RevokeRestaurantOwnerRequest {
  restaurantId?: unknown;
  reason?: unknown;
}

export interface AssignRestaurantOwnerResult {
  restaurantId: string;
  ownerUserId: string;
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
   * Who held it. The document no longer says, and an operator reading back what
   * their click did should not have to find the log entry to know.
   */
  previousOwnerUserId: string;
  claimStatus: 'revoked';
}

const getString = (data: DocumentData, field: string): string =>
  typeof data[field] === 'string' ? data[field] : '';

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
 * Assigns a verified restaurant to a business account.
 *
 * Every document in `/restaurants` is a verified restaurant: an unverified
 * place is a `place` string on a Bite and has no document to assign. So
 * "verified" is the collection, and a restaurant that is not in it is
 * `not-found` rather than refused for being unverified.
 *
 * **One owner per restaurant, enforced here.** A restaurant that already has a
 * different owner is refused and the refusal names the current one, rather than
 * being silently reassigned. Reassignment is revoke then assign, so the trail
 * shows two decisions with two reasons instead of one write that quietly
 * replaced an accountable party.
 *
 * Repeating the same assignment is idempotent — it returns the current state
 * without writing — which is the rule `verifyRestaurantCandidate` already
 * follows for the other multi-step restaurant workflow.
 *
 * The read and the write are one transaction, so two operators assigning the
 * same restaurant to two accounts cannot both see it unowned and both write.
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

      const currentOwnerUserId = getString(
        snapshot.data() ?? {},
        'ownerUserId',
      );

      if (currentOwnerUserId === ownerUserId) {
        return {
          restaurantId,
          ownerUserId,
          claimStatus: 'claimed',
          status: 'already-assigned',
        };
      }

      if (currentOwnerUserId) {
        throw new HttpsError(
          'failed-precondition',
          `Restaurant is already assigned to ${currentOwnerUserId}. Revoke that assignment before assigning it again.`,
        );
      }

      const now = new Date();

      transaction.update(restaurantRef, {
        ownerUserId,
        claimStatus: 'claimed',
        claimedAt: now.toISOString(),
        claimedAtTimestamp: now.getTime(),
        updatedAt: now.toISOString(),
        updatedAtTimestamp: now.getTime(),
      });

      return {
        restaurantId,
        ownerUserId,
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
 * Takes a restaurant back from the account holding it.
 *
 * The owner and the grant timestamps are deleted rather than blanked, so an
 * unowned restaurant carries no field at all and the "missing means unclaimed"
 * rule on the model stays the only rule a reader needs. `claimStatus` becomes
 * `revoked` rather than `unclaimed`, because "it was taken away" and "nobody
 * ever had it" are different answers to an operator looking at the restaurant.
 *
 * Revoking a restaurant nobody holds is refused. Writing `revoked` over an
 * `unclaimed` restaurant would record a decision that was never made, on a
 * field the ownership-scoped rules of issue #1078 will read.
 */
export const revokeRestaurantOwnerHandler = async (
  request: CallableRequest<RevokeRestaurantOwnerRequest>,
): Promise<RevokeRestaurantOwnerResult> => {
  requireAdmin(request);

  const restaurantId = parseRequired(
    request.data?.restaurantId,
    'restaurantId',
  );
  const reason = parseReason(request.data?.reason);

  const db = getFirestore();
  const restaurantRef = db.collection(RESTAURANT_COLLECTION).doc(restaurantId);

  logOperatorAction(request, {
    action: 'revokeRestaurantOwner',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'started',
    reason,
  });

  const result = await db.runTransaction<RevokeRestaurantOwnerResult>(
    async (transaction) => {
      const snapshot = await transaction.get(restaurantRef);

      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Restaurant was not found.');
      }

      const previousOwnerUserId = getString(
        snapshot.data() ?? {},
        'ownerUserId',
      );

      if (!previousOwnerUserId) {
        throw new HttpsError(
          'failed-precondition',
          'Restaurant is not assigned to an account.',
        );
      }

      const now = new Date();

      transaction.update(restaurantRef, {
        ownerUserId: FieldValue.delete(),
        claimedAt: FieldValue.delete(),
        claimedAtTimestamp: FieldValue.delete(),
        claimStatus: 'revoked',
        updatedAt: now.toISOString(),
        updatedAtTimestamp: now.getTime(),
      });

      return {
        restaurantId,
        previousOwnerUserId,
        claimStatus: 'revoked',
      };
    },
  );

  logOperatorAction(request, {
    action: 'revokeRestaurantOwner',
    targetType: 'restaurant',
    targetId: restaurantId,
    outcome: 'succeeded',
    reason,
    details: { previousOwnerUserId: result.previousOwnerUserId },
  });

  return result;
};

/**
 * The two halves live in one module because they are one invariant.
 *
 * "Exactly one accountable owner" is enforced by the pair: assign refuses a
 * restaurant that is held, revoke refuses one that is not, and each is the
 * other's precondition. Split across two files, the two would be free to drift
 * apart on what counts as owned — which field is read, whether an empty string
 * is an owner — and the invariant would live in neither.
 */
export const assignRestaurantOwner = onAppCheck<AssignRestaurantOwnerRequest>(
  assignRestaurantOwnerHandler,
);

export const revokeRestaurantOwner = onAppCheck<RevokeRestaurantOwnerRequest>(
  revokeRestaurantOwnerHandler,
);
