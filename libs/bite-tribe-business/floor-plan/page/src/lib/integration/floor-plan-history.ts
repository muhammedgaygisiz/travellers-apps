/**
 * Undo and redo for the floor-plan editor (GitHub issue #1083).
 *
 * ## Snapshots rather than inverse operations
 *
 * A command-pattern history stores each mutation and how to undo it, which is
 * smaller and is the wrong trade here. Half of these mutations are not
 * invertible on their own: a resize snaps a side to the grid and clamps it, a
 * move is trimmed by the room's edge, and a delete has to put an object back at
 * a position the delete never recorded. Every one of those would need its
 * inverse written and kept in step with the forward path, and the failure mode
 * is an undo that lands an object a few millimetres from where it was — which
 * is exactly what the acceptance criterion about restoring the *exact* prior
 * geometry rules out.
 *
 * A layout is a handful of small plain objects, so keeping {@link HISTORY_LIMIT}
 * whole copies of one costs less than the bookkeeping would.
 *
 * ## What is in it
 *
 * Only what is stored. Selection, pan, zoom, the grid spacing and the snap
 * toggle are viewport state: they change nothing an owner could lose, and an
 * undo stack that included them would spend its entries undoing scroll
 * positions instead of the edit the owner wanted back.
 */

/**
 * How many steps back the editor remembers.
 *
 * Deep enough to cover a session of arranging a room and shallow enough that
 * the layouts are never a memory question. There is no autosave to fall back on
 * until issue #1088, so the limit is the only thing that discards work.
 */
export const HISTORY_LIMIT = 50;

/** A present value, what came before it, and what an undo took away. */
export interface HistoryState<T> {
  present: T;
  past: readonly T[];
  future: readonly T[];
}

export const historyOf = <T>(present: T): HistoryState<T> => ({
  present,
  past: [],
  future: [],
});

export const canUndo = <T>(state: HistoryState<T>): boolean =>
  state.past.length > 0;

export const canRedo = <T>(state: HistoryState<T>): boolean =>
  state.future.length > 0;

/**
 * A new present, with the old one kept.
 *
 * Recording drops the redo stack, because the owner has taken a different
 * branch: keeping it would offer a redo that reapplied an edit to a plan it was
 * never made against.
 */
export const record = <T>(
  state: HistoryState<T>,
  next: T,
): HistoryState<T> => ({
  present: next,
  past: [...state.past, state.present].slice(-HISTORY_LIMIT),
  future: [],
});

export const undo = <T>(state: HistoryState<T>): HistoryState<T> => {
  const previous = state.past[state.past.length - 1];

  return previous === undefined
    ? state
    : {
        present: previous,
        past: state.past.slice(0, -1),
        future: [state.present, ...state.future],
      };
};

export const redo = <T>(state: HistoryState<T>): HistoryState<T> => {
  const [next, ...rest] = state.future;

  return next === undefined
    ? state
    : {
        present: next,
        past: [...state.past, state.present].slice(-HISTORY_LIMIT),
        future: rest,
      };
};
