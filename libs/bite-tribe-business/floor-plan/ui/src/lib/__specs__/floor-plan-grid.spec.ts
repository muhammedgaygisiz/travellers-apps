import {
  DEFAULT_GRID_SPACING,
  GRID_SPACINGS,
  snapToGrid,
} from '../floor-plan-grid';

describe(snapToGrid.name, () => {
  it('moves a value to the nearest grid line', () => {
    expect(snapToGrid(8140, DEFAULT_GRID_SPACING)).toBe(8000);
    expect(snapToGrid(8260, DEFAULT_GRID_SPACING)).toBe(8500);
  });

  it('leaves a value that already sits on a line alone', () => {
    expect(snapToGrid(8000, DEFAULT_GRID_SPACING)).toBe(8000);
  });

  it('only rounds to a whole millimetre when there is no grid', () => {
    expect(snapToGrid(8143.7, 0)).toBe(8144);
    expect(snapToGrid(8143.7, -1)).toBe(8144);
  });

  it('is idempotent, so snapping repeatedly cannot drift', () => {
    const once = snapToGrid(8143, 250);

    expect(snapToGrid(once, 250)).toBe(once);
  });

  it('offers the default spacing among the ones the editor lists', () => {
    expect(GRID_SPACINGS).toContain(DEFAULT_GRID_SPACING);
  });
});
