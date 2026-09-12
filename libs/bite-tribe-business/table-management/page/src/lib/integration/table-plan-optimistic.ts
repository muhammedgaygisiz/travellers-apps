import { TableState, TableStatus } from 'model';

/**
 * What the plan shows between the tap and the server agreeing
 * (GitHub issue #1094).
 *
 * ## Why the view moves before the backend answers
 *
 * A host seating a party is standing in front of that party. The round trip is
 * a callable, a transaction and a listener push, which on a restaurant's
 * wifi - the connectivity the epic explicitly does not assume is good - is
 * long enough that a table which does not change colour reads as a tap that
 * missed. What happens then is that the host taps again, and the second
 * request is a `occupied` to `occupied` transition the backend refuses, so the
 * feedback for a *successful* seating becomes an error message.
 *
 * So the table changes immediately, and this is the layer that says so: an
 * entry per table in flight, laid over the states the listener delivers.
 *
 * ## Why it is a layer and not a write into the state
 *
 * Because it has to come off again. A transition the backend refuses - the
 * conflict of issue #1092, a table the owner disabled, a lost connection -
 * must leave the plan showing what the table is actually doing, and the only
 * copy of that is the listener's. Writing the guess into the same map would
 * have meant reconstructing the truth from an error message; keeping it above
 * means a rollback is a deletion.
 *
 * ## When the guess comes off on success
 *
 * Not when the callable resolves. The listener has its own timing, and
 * dropping the overlay at the moment the promise settles leaves a frame or two
 * where the table is back to its old status before the snapshot arrives - the
 * flicker that makes staff doubt the screen. So a settled call records the
 * `since` the backend stamped, and the overlay stays until a state at least
 * that recent has actually been delivered. After that the listener is saying
 * the same thing, and the layer has nothing left to add.
 */

/** One table's state as the view is showing it before the server agrees. */
export interface OptimisticTransition {
  /** The status the staff member asked for. */
  status: TableStatus;
  /**
   * When the view started showing it.
   *
   * The clock on the table starts here rather than at zero, so a seating that
   * takes two seconds to confirm does not read as a party that arrived two
   * seconds ago and then jump.
   */
  since: number;
  /**
   * The `since` the backend stamped, once the call has answered.
   *
   * Absent while the call is in flight, which is what distinguishes "waiting"
   * from "confirmed but not yet delivered" - only the second can be superseded.
   */
  confirmedSince?: number;
}

/**
 * Whether the listener has caught up with a guess, so the guess can go.
 *
 * `>=` rather than `>`: the delivered state *is* the transition's own state in
 * the ordinary case, and its `since` is exactly the one the callable returned.
 */
export const isSuperseded = (
  entry: OptimisticTransition,
  state: TableState | undefined,
): boolean =>
  entry.confirmedSince !== undefined &&
  state !== undefined &&
  state.since >= entry.confirmedSince;

/**
 * The states the view should draw: what the listener delivered, with the
 * tables in flight showing what was asked of them.
 *
 * The overlaid state carries no `note` and no `visitId`, because the backend
 * *replaces* the state document on a transition rather than merging into it
 * (issue #1092). A note left on a table by the last party must not appear to
 * survive the table being freed, and a visit pointer must not outlive the
 * party it points at - showing either for the second between the tap and the
 * snapshot would be showing something that is already untrue.
 *
 * `updatedByUserId` is carried forward from the delivered state, or empty when
 * there is none. It names the last *confirmed* writer, and a transition that
 * has not been accepted has not written anything.
 */
export const mergeOptimistic = (
  live: ReadonlyMap<string, TableState>,
  pending: ReadonlyMap<string, OptimisticTransition>,
  restaurantId: string,
): ReadonlyMap<string, TableState> => {
  if (pending.size === 0) {
    return live;
  }

  const merged = new Map(live);

  pending.forEach((entry, tableId) => {
    const current = live.get(tableId);

    if (isSuperseded(entry, current)) {
      return;
    }

    merged.set(tableId, {
      tableId,
      restaurantId: current?.restaurantId ?? restaurantId,
      status: entry.status,
      since: entry.since,
      updatedByUserId: current?.updatedByUserId ?? '',
    });
  });

  return merged;
};

/**
 * The entries still worth keeping, or nothing when none of them changed.
 *
 * Answering `undefined` rather than a fresh equal map is what lets the caller
 * write the signal only when something actually came off, instead of once per
 * snapshot for the whole of a service.
 */
export const prunedOptimistic = (
  live: ReadonlyMap<string, TableState>,
  pending: ReadonlyMap<string, OptimisticTransition>,
): Map<string, OptimisticTransition> | undefined => {
  const next = new Map(pending);
  let changed = false;

  pending.forEach((entry, tableId) => {
    if (isSuperseded(entry, live.get(tableId))) {
      next.delete(tableId);
      changed = true;
    }
  });

  return changed ? next : undefined;
};
