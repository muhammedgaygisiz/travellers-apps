import { logger } from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/https';
import { BiteTribeRole, rolesOf } from './roles';

/**
 * The audit trail for operator actions is Cloud Logging, by decision: there is
 * no in-app record and none is planned at this scale (epic #1471).
 *
 * That decision only holds if the logs are usable, and a log you have to read
 * three different ways is not an audit trail. Before issue #1477 the eight
 * operator callables carried three shapes between them — `callerUid`,
 * `requestedBy` and `uid` all meant the actor, `verifyRestaurantCandidate` and
 * `clusterRestaurantCandidateForBite` recorded no actor at all — so neither
 * "what did we do to this account" nor "what did this operator do" had an
 * answer that did not depend on who wrote the callable.
 *
 * This module is that one shape. Every operator callable logs through it, and
 * `src/__specs__/operator-action-logging.spec.ts` fails the build when one
 * does not.
 */

/**
 * The operator actions that exist.
 *
 * The name is the callable's exported name, because that is what an operator
 * triggered and what every other list in this project — the authorization
 * classification, the admin app's call sites — already keys on.
 *
 * The union is deliberate rather than a free-form string: a query per action
 * needs the set of actions to be knowable, and adding a member is the one line
 * of review that says "this is a new thing we can do to an account".
 */
export const OPERATOR_ACTIONS = [
  'assignRestaurantOwner',
  'backfillBiteAddress',
  'backfillReviewTimestamps',
  'clusterRestaurantCandidateForBite',
  'deleteBiteAsOperator',
  'revokeRestaurantOwner',
  'sendNewVersionNotification',
  'setUserBlocked',
  'setUserRoles',
  'setUserSubscriptionTier',
  'verifyRestaurantCandidate',
] as const;

export type OperatorAction = (typeof OPERATOR_ACTIONS)[number];

/**
 * What the action was performed on.
 *
 * The type is separate from the id because the id alone does not say what it
 * identifies, and an operator reading the trail of an account needs to know
 * whether `abc123` was the account or a Bite that happened to share a prefix.
 */
export type OperatorTargetType =
  | 'appInstallation'
  | 'bite'
  | 'restaurant'
  | 'restaurantCandidate'
  | 'review'
  | 'user';

/**
 * `started` and `succeeded` bracket an action that does enough work to fail
 * halfway. A `started` with no matching `succeeded` is a crashed or timed-out
 * operator action, which is exactly the thing an audit trail should still show.
 *
 * `failed` exists for the caller that catches its own failure and wants it in
 * the trail. No callable does yet: a rejected operator action is already the
 * function's own error entry in the same logs, and wrapping every handler in a
 * try/catch would change what the callables do, which issue #1477 puts out of
 * scope.
 */
export type OperatorOutcome = 'started' | 'succeeded' | 'failed';

export interface OperatorActionLog {
  action: OperatorAction;
  targetType: OperatorTargetType;
  /**
   * The single account, Bite, candidate or review the action was performed on.
   *
   * Omitted by an action that operates on a whole collection rather than on one
   * record — the review timestamp migration, the new-version announcement — so
   * that "which one" is absent rather than answered with something invented.
   */
  targetId?: string;
  outcome: OperatorOutcome;
  /**
   * Why the operator did it, where the action takes a reason.
   *
   * Required by `setUserSubscriptionTier`, because a manually granted Pro is
   * otherwise indistinguishable from a purchased one, and by
   * `assignRestaurantOwner` and `revokeRestaurantOwner`, because an ownership
   * change leaves no other record of why it happened. Absent elsewhere.
   */
  reason?: string;
  /**
   * Whatever else this particular action needs recorded: the roles written, the
   * tier before and after, the restaurant that was created.
   *
   * Nested under one key on purpose. Cloud Logging indexes `jsonPayload` paths,
   * so a per-action field promoted to the top level would compete with the
   * fields every action shares, and `jsonPayload.details.tier` is still a
   * query.
   */
  details?: Record<string, unknown>;
}

interface OperatorActionPayload extends Omit<OperatorActionLog, 'action'> {
  /**
   * The marker every operator action carries, holding the action name.
   *
   * One field is both "this entry is an operator action" and "which one", so
   * `jsonPayload.operatorAction:*` is the whole trail and
   * `jsonPayload.operatorAction="setUserRoles"` is one slice of it.
   */
  operatorAction: OperatorAction;
  /**
   * The operator who performed it, and the roles their verified ID token
   * carried at the time.
   *
   * `callerUid` keeps the name `setUserRoles` and `setUserSubscriptionTier`
   * already wrote, so entries from before issue #1477 answer the same query.
   */
  callerUid: string;
  callerRoles: BiteTribeRole[];
}

/**
 * Records one operator action in the shape every operator action shares.
 *
 * The actor is read off the request rather than passed in, so it cannot be
 * forgotten, and cannot be anything other than the identity Firebase verified.
 * Call this after `requireAdmin`, which is what guarantees `request.auth`
 * exists.
 *
 * The fields are structured rather than interpolated into the message. Cloud
 * Logging indexes `jsonPayload` fields, so `jsonPayload.targetId="abc"` is a
 * query and the same value inside a formatted string is a substring scan.
 */
export const logOperatorAction = (
  request: CallableRequest<unknown>,
  { action, ...rest }: OperatorActionLog,
): void => {
  const payload: OperatorActionPayload = {
    operatorAction: action,
    callerUid: request.auth?.uid ?? '',
    callerRoles: rolesOf(request),
    ...rest,
  };

  logger.info(`operator action: ${action} ${rest.outcome}`, payload);
};
