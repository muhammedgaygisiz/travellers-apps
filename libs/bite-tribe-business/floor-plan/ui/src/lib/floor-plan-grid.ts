import { Millimetres } from 'model';

/**
 * Half a metre, the spacing a plan starts at.
 *
 * Chosen because it is the coarsest grid that still lands a table where an
 * owner meant to put it: a 500 mm step is roughly one chair's width, so a
 * snapped row of tables reads as a row rather than as a grid artefact.
 */
export const DEFAULT_GRID_SPACING: Millimetres = 500;

/** The spacings the editor offers, in millimetres. */
export const GRID_SPACINGS: readonly Millimetres[] = [100, 250, 500, 1000];

/**
 * A millimetre value moved to the nearest grid line.
 *
 * Snapping is a decision about where the *next* edit lands. It is never applied
 * to stored coordinates in bulk: turning the grid on must not walk through a
 * plan an owner already arranged and move everything in it, which is why
 * nothing in this library calls it on load.
 *
 * A spacing of zero or less means no grid, and the value is only rounded to a
 * whole millimetre — the model's unit is an integer either way.
 */
export const snapToGrid = (
  value: Millimetres,
  spacing: Millimetres,
): Millimetres =>
  spacing > 0 ? Math.round(value / spacing) * spacing : Math.round(value);
