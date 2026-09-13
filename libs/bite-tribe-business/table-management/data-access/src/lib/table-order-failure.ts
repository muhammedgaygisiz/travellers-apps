/**
 * Why an order did not move, as the queue has to explain it
 * (GitHub issue #1105).
 *
 * The sibling of `tableTransitionFailure`, and deliberately a second function
 * rather than the same one widened. The two share three codes and differ on the
 * ones that matter: an order transition is never queued offline, so there is no
 * `offline` outcome to route to a queue, and it can be refused for an argument
 * the table transition has no equivalent of - a cancellation staff sent without
 * a reason. A single function returning a union of both vocabularies would have
 * every call site checking for outcomes its screen cannot produce.
 *
 * The code is the primary signal and the message is a fallback, for the reason
 * spelled out in full on `table-transition-failure.ts`: the shape an error
 * arrives in differs by platform, and the backend's own wording is stable and
 * distinctive enough to match on when the code is folded into it.
 */

/** Which sentence the staff member is owed. */
export type TableOrderFailure =
  /**
   * Somebody else moved the order first.
   *
   * The common one on a busy pass, and the reason it is not simply an error:
   * the queue is a listener on the very document the winning transition wrote,
   * so the true status is already on its way. What staff need is the sentence,
   * not a retry.
   */
  | 'conflict'
  /** The move is not in the matrix, usually because the order has ended. */
  | 'not-allowed'
  /** The order is gone: the visit was deleted, or the id was stale. */
  | 'not-found'
  /**
   * The request was malformed - in practice, a cancellation with no reason.
   *
   * Reachable rather than theoretical: the queue refuses to send one, and this
   * is the backend declining to take the screen's word for it.
   */
  | 'reason-required'
  /** The caller does not work at this restaurant, or is no longer signed in. */
  | 'permission'
  /** Everything else, including a request that never left the device. */
  | 'unknown';

/** The `code` and `message` of an unknown rejection, as one lowercase string. */
const describe = (error: unknown): string => {
  if (typeof error !== 'object' || error === null) {
    return String(error ?? '').toLowerCase();
  }

  const code =
    'code' in error ? String((error as { code?: unknown }).code) : '';
  const message =
    'message' in error ? String((error as { message?: unknown }).message) : '';

  return `${code} ${message}`.toLowerCase();
};

/** Which sentence a failed `transitionTableOrderStatus` call is owed. */
export const tableOrderFailure = (error: unknown): TableOrderFailure => {
  const described = describe(error);

  if (described.includes('aborted') || described.includes('changed it first')) {
    return 'conflict';
  }

  if (described.includes('not-found')) {
    return 'not-found';
  }

  // Before the generic `invalid-argument`, because a missing reason is the one
  // malformed request staff can actually do something about.
  if (described.includes('needs a reason')) {
    return 'reason-required';
  }

  if (
    described.includes('failed-precondition') ||
    described.includes('invalid-argument')
  ) {
    return 'not-allowed';
  }

  if (
    described.includes('permission-denied') ||
    described.includes('unauthenticated')
  ) {
    return 'permission';
  }

  return 'unknown';
};
