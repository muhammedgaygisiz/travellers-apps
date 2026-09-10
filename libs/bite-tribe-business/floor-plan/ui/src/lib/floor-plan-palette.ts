import { FloorPlanSize, Millimetres } from 'model';
import { FloorPlanItemVariant } from './floor-plan-item';

/**
 * One entry of the object palette (GitHub issue #1083).
 *
 * `size` is the entry's real-world default, not a drawing convention. A palette
 * that dropped everything at one arbitrary square would make the first thing an
 * owner does resizing nine objects, and a plan is only worth drawing if it is
 * to scale — so a chair arrives 450 mm across because a chair is 450 mm across.
 *
 * The label is a Transloco key rather than text: this library is shared UI and
 * carries no copy of its own.
 */
export interface FloorPlanPaletteEntry {
  variant: FloorPlanItemVariant;
  size: FloorPlanSize;
  labelKey: string;
}

/**
 * Default seating capacity for a table placed from the palette.
 *
 * Both defaults are a four-top, which is the commonest table in a restaurant of
 * any size. The owner corrects it in the properties panel of issue #1084, which
 * owns capacity — placing a table here only has to produce a table that is
 * plausible and complete enough to store.
 */
export const DEFAULT_TABLE_SEATS = 4;

/**
 * The palette, in the order it is shown.
 *
 * Tables first because they are what an owner places twenty of, then seating,
 * then the structure that gives the room its outline, then the rest. A palette
 * sorted by the model's own type union would put `wall` first and bury the
 * table under it.
 */
export const FLOOR_PLAN_PALETTE: readonly FloorPlanPaletteEntry[] = [
  {
    variant: 'table-rectangle',
    size: { width: 1200, height: 800 },
    labelKey: 'floor-plan-object-table-rectangle',
  },
  {
    variant: 'table-round',
    size: { width: 900, height: 900 },
    labelKey: 'floor-plan-object-table-round',
  },
  {
    variant: 'chair',
    size: { width: 450, height: 450 },
    labelKey: 'floor-plan-object-chair',
  },
  {
    variant: 'wall',
    size: { width: 2000, height: 100 },
    labelKey: 'floor-plan-object-wall',
  },
  {
    variant: 'door',
    size: { width: 900, height: 100 },
    labelKey: 'floor-plan-object-door',
  },
  {
    variant: 'counter',
    size: { width: 2000, height: 600 },
    labelKey: 'floor-plan-object-counter',
  },
  {
    variant: 'bar',
    size: { width: 3000, height: 600 },
    labelKey: 'floor-plan-object-bar',
  },
  {
    variant: 'blocked',
    size: { width: 1000, height: 1000 },
    labelKey: 'floor-plan-object-blocked',
  },
  {
    variant: 'decoration',
    size: { width: 500, height: 500 },
    labelKey: 'floor-plan-object-decoration',
  },
];

export const paletteEntry = (
  variant: string,
): FloorPlanPaletteEntry | undefined =>
  FLOOR_PLAN_PALETTE.find((entry) => entry.variant === variant);

/**
 * The longest side in the palette, so every preview can be drawn at one scale.
 *
 * Scaling each preview to its own box would draw a chair and a three-metre bar
 * at the same width, which is exactly the impression a to-scale editor must not
 * give before the owner has placed anything.
 */
export const PALETTE_PREVIEW_EXTENT: Millimetres = FLOOR_PLAN_PALETTE.reduce(
  (longest, entry) => Math.max(longest, entry.size.width, entry.size.height),
  0,
);
