/**
 * Why a transition did not happen, as the view has to explain it
 * (GitHub issue #1094).
 *
 * ## Read off the code, not the details
 *
 * `transitionTableState` throws an `aborted` `HttpsError` carrying a
 * `TableStateConflict` in its details: the status the table holds now, who set
 * it and when. On the web that structure survives; across the Capacitor bridge
 * it is not something to rely on, and a message built from a field that is
 * sometimes there is a message that is sometimes wrong.
 *
 * It is also not needed. The view refusing the transition is a *listener* on
 * the very documents the winning transition wrote, so the true status is on
 * its way regardless - and the rollback puts it on screen. What the error has
 * to supply is which sentence to say, and the code alone settles that.
 *
 * ## Why the message is consulted at all
 *
 * The code is the primary signal and the message is a fallback, because the
 * shape an error arrives in differs by platform: the web SDK gives
 * `functions/aborted`, and a native rejection can arrive with the code folded
 * into the message instead. Matching over both is what `getAccountDeletionFailureReason`
 * settled on for the same reason. The backend's own wording is stable and
 * distinctive - "Someone else changed it first" - so the fallback is a
 * substring rather than a parse.
 */

/** Which sentence the staff member is owed. */
export type TableTransitionFailure =
  /** Somebody else moved the table first. The plan is about to show what. */
  | 'conflict'
  /**
   * The request never reached the backend, and sending it again might work
   * (GitHub issue #1096).
   *
   * The one failure that is not a sentence but a queue entry. A basement
   * dining room with two bars of signal is the connectivity this epic
   * explicitly does not assume away, and a seating lost to it is a party
   * standing at a table the screen says is free.
   */
  | 'offline'
  /**
   * The table cannot do that right now: the move is not in the matrix, or the
   * owner has taken the table out of service.
   */
  | 'not-allowed'
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

/**
 * What a rejection that never left the device looks like.
 *
 * `unavailable` and `deadline-exceeded` are the codes the Functions SDKs raise
 * when the call could not be delivered, and the message fragments cover the
 * bridge and the fetch layer underneath them, which on a dropped connection
 * report in their own words rather than in a code.
 *
 * `internal` is deliberately absent. It is what a genuinely failing backend
 * raises as well as what some web builds raise for a failed fetch, and
 * treating it as a queue entry would leave a request that will never succeed
 * being retried instead of reported. The device's own network state is what
 * catches the ordinary offline case before a call is even attempted; this list
 * is the backstop for the connection that dropped mid-flight.
 */
const OFFLINE_MARKERS: readonly string[] = [
  'unavailable',
  'deadline-exceeded',
  'network',
  'failed to fetch',
  'internet connection',
  'offline',
];

/** Which sentence a failed `transitionTableState` call is owed. */
export const tableTransitionFailure = (
  error: unknown,
): TableTransitionFailure => {
  const described = describe(error);

  if (described.includes('aborted') || described.includes('changed it first')) {
    return 'conflict';
  }

  if (described.includes('failed-precondition')) {
    return 'not-allowed';
  }

  if (
    described.includes('permission-denied') ||
    described.includes('unauthenticated')
  ) {
    return 'permission';
  }

  // Last, so a code that means something definite is never mistaken for a
  // dropped connection because its message happened to mention one.
  if (OFFLINE_MARKERS.some((marker) => described.includes(marker))) {
    return 'offline';
  }

  return 'unknown';
};
