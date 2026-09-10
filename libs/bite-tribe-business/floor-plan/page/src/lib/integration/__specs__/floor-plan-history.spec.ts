import {
  HISTORY_LIMIT,
  canRedo,
  canUndo,
  historyOf,
  record,
  redo,
  undo,
} from '../floor-plan-history';

describe('the floor plan edit history', () => {
  it('starts with nothing to undo and nothing to redo', () => {
    const state = historyOf('a');

    expect(state.present).toBe('a');
    expect(canUndo(state)).toBe(false);
    expect(canRedo(state)).toBe(false);
  });

  it('walks back and forward through what was recorded', () => {
    const state = record(record(historyOf('a'), 'b'), 'c');

    const back = undo(undo(state));
    expect(back.present).toBe('a');

    const forward = redo(redo(back));
    expect(forward.present).toBe('c');
  });

  /**
   * The acceptance criterion that undo restores the *exact* prior state. A
   * snapshot history restores the value that was there rather than an inverse
   * operation's approximation of it, so this is an identity check and not an
   * equality one.
   */
  it('restores the very object that was recorded', () => {
    const before = { rotation: 137 };
    const after = { rotation: 45 };

    const restored = undo(record(historyOf(before), after));

    expect(restored.present).toBe(before);
  });

  it('does nothing at either end rather than losing the present', () => {
    const start = historyOf('a');

    expect(undo(start)).toBe(start);
    expect(redo(start)).toBe(start);
  });

  /**
   * Recording after an undo is a different branch. Keeping the redo would offer
   * to reapply an edit against a plan it was never made on.
   */
  it('drops the redo stack once a new edit is recorded', () => {
    const branched = record(undo(record(historyOf('a'), 'b')), 'c');

    expect(canRedo(branched)).toBe(false);
    expect(branched.present).toBe('c');
    expect(undo(branched).present).toBe('a');
  });

  it('keeps at most the last few steps', () => {
    const deep = Array.from({ length: HISTORY_LIMIT + 20 }).reduce<
      ReturnType<typeof historyOf<number>>
    >((state, _entry, index) => record(state, index + 1), historyOf(0));

    expect(deep.past).toHaveLength(HISTORY_LIMIT);
    expect(deep.past[0]).toBe(20);
  });
});
