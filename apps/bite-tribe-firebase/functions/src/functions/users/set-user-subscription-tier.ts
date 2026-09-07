import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { logOperatorAction } from '../shared/operator-log';
import { requireAdmin } from '../shared/roles';
import {
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  isSubscriptionTier,
  tierFromUserData,
} from '../shared/subscription-tier';

const USERS_COLLECTION = 'users';

/**
 * Long enough for "refunded via support ticket 412, granted for the rest of the
 * month", short enough that nobody pastes a conversation into a log line.
 */
const MAX_REASON_LENGTH = 500;

interface SetUserSubscriptionTierRequest {
  uid?: unknown;
  tier?: unknown;
  reason?: unknown;
}

export interface SetUserSubscriptionTierResult {
  uid: string;
  tier: SubscriptionTier;
  previousTier: SubscriptionTier | null;
}

const parseUid = (value: unknown): string => {
  const uid = typeof value === 'string' ? value.trim() : '';

  if (!uid) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }

  return uid;
};

const parseTier = (value: unknown): SubscriptionTier => {
  if (!isSubscriptionTier(value)) {
    throw new HttpsError(
      'invalid-argument',
      `tier must be one of: ${SUBSCRIPTION_TIERS.join(', ')}.`,
    );
  }

  return value;
};

/**
 * The reason is required, not optional.
 *
 * Cloud Logging is the only record this action leaves, and until the entitlement
 * model exists (#1126) a manually granted Pro is indistinguishable from a
 * purchased one: no store knows about it, nothing renews it and nothing expires
 * it. The reason is the single thing that lets someone reading the log later
 * tell a support grant from a mistake.
 */
const parseReason = (value: unknown): string => {
  const reason = typeof value === 'string' ? value.trim() : '';

  if (!reason) {
    throw new HttpsError('invalid-argument', 'reason is required.');
  }

  if (reason.length > MAX_REASON_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `reason must be at most ${MAX_REASON_LENGTH} characters.`,
    );
  }

  return reason;
};

/**
 * Sets an account's subscription tier for a support case.
 *
 * **This grants no capability.** `subscriptionTier` is a display mirror: the
 * settings page and the profile badge read it, and no callable and no rule
 * gates on it. Moving an account to Pro changes what it sees, not what it may
 * do. The entitlement that will be the authority belongs to #1122 and #1126,
 * and this callable is what will write it when it exists — the guard, the
 * shape and the log line do not change with the value underneath them.
 *
 * The write is an `update` on an existing document rather than a `set`, so an
 * account with no `/users` document is reported as `not-found` instead of
 * acquiring a document holding nothing but a tier. Nothing else is written,
 * including `updatedAt`: that field marks a profile edit by the account's owner,
 * and an operator action is not one.
 *
 * An operator may change their own tier. Unlike dropping one's own `admin` role
 * (`setUserRoles`) or blocking oneself (#1474), it locks nobody out of anything.
 */
export const setUserSubscriptionTierHandler = async (
  request: CallableRequest<SetUserSubscriptionTierRequest>,
): Promise<SetUserSubscriptionTierResult> => {
  requireAdmin(request);
  const targetUid = parseUid(request.data?.uid);
  const tier = parseTier(request.data?.tier);
  const reason = parseReason(request.data?.reason);

  const userRef = getFirestore().collection(USERS_COLLECTION).doc(targetUid);
  const snapshot = await userRef.get();

  if (!snapshot.exists) {
    throw new HttpsError(
      'not-found',
      `No user document found for ${targetUid}.`,
    );
  }

  const previousTier = tierFromUserData(snapshot.data());

  await userRef.update({ subscriptionTier: tier });

  logOperatorAction(request, {
    action: 'setUserSubscriptionTier',
    targetType: 'user',
    targetId: targetUid,
    outcome: 'succeeded',
    reason,
    details: { previousTier, tier },
  });

  return { uid: targetUid, tier, previousTier };
};

export const setUserSubscriptionTier =
  onAppCheck<SetUserSubscriptionTierRequest>(setUserSubscriptionTierHandler);
