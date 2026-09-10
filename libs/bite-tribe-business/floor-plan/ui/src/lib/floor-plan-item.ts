import {
  FloorPlanObject,
  FloorPlanObjectType,
  FloorPlanPoint,
  FloorPlanRotation,
  FloorPlanSize,
  RestaurantTable,
  TableShape,
} from 'model';

/**
 * What a drawn item is, once it is on the canvas (GitHub issue #1083).
 *
 * The model keeps geometry and tables apart for good reasons: geometry lives
 * inline in its room document and a table is its own document with its own
 * lifetime (issue #1081). The *editor* has the opposite problem. A selection
 * holds whatever the owner shift-clicked, a drag moves all of it, and one undo
 * step puts all of it back — so a canvas that had to branch on "is this a wall
 * or a table" in every gesture would carry that branch through selection,
 * snapping, resizing, rotation and the history.
 *
 * So the canvas draws {@link FloorPlanItem}, which is the geometry the two
 * shapes genuinely share, and the branch happens exactly twice: here, on the
 * way in and on the way out.
 */
export type FloorPlanItemKind = 'object' | 'table';

/**
 * The palette entry an item came from, and the one field the canvas draws by.
 *
 * A table's shape and an object's type are one vocabulary here because they
 * answer the same question — what does this look like on the plan — and
 * because a palette is a flat list to the owner clicking it.
 */
export type FloorPlanItemVariant =
  FloorPlanObjectType | 'table-rectangle' | 'table-round';

/**
 * One drawable, selectable, movable thing on the plan.
 *
 * `size` is present for a round table too, as its diameter on both axes. A
 * circle drawn from a square box needs no special case in the bounds, the
 * snapping or the resize maths, and {@link tableFromItem} turns it back into
 * the single `diameter` the model stores.
 */
export interface FloorPlanItem {
  id: string;
  kind: FloorPlanItemKind;
  variant: FloorPlanItemVariant;
  /** Centre of the item, in room millimetres. */
  position: FloorPlanPoint;
  /** Extent before rotation. */
  size: FloorPlanSize;
  rotation: FloorPlanRotation;
  label?: string;
  /** Drawn as a circle rather than a rectangle. */
  round: boolean;
  /**
   * Seating capacity, on a table. Absent on geometry, which seats nobody.
   *
   * Here for the same reason `label` is: the canvas has to *draw* it. A plan is
   * read at a glance across a room and printed on to QR sheets, and a table
   * whose number and capacity are only in a side panel is a rectangle again as
   * soon as the panel is closed. Nothing in a gesture reads either field, so
   * carrying them costs the shared geometry nothing.
   */
  seats?: number;
  /**
   * `false` on a table the owner has taken out of service.
   *
   * Absent on geometry, which has no service state. A disabled table stays on
   * the plan and is drawn differently, because it is still a real place in the
   * room ([[Table]]).
   */
  enabled?: boolean;
}

/** Whether a variant is a table rather than a piece of geometry. */
export const isTableVariant = (variant: FloorPlanItemVariant): boolean =>
  variant === 'table-rectangle' || variant === 'table-round';

/** The table shape a variant stands for, or `undefined` for geometry. */
export const tableShapeOf = (
  variant: FloorPlanItemVariant,
): TableShape | undefined => {
  if (variant === 'table-rectangle') {
    return 'rectangle';
  }

  return variant === 'table-round' ? 'round' : undefined;
};

export const itemFromObject = (object: FloorPlanObject): FloorPlanItem => ({
  id: object.id,
  kind: 'object',
  variant: object.type,
  position: object.position,
  size: object.size,
  rotation: object.rotation,
  label: object.label,
  round: false,
});

export const itemFromTable = (table: RestaurantTable): FloorPlanItem => ({
  id: table.id,
  kind: 'table',
  variant: table.shape === 'round' ? 'table-round' : 'table-rectangle',
  position: table.position,
  size:
    table.shape === 'round'
      ? { width: table.diameter, height: table.diameter }
      : table.size,
  rotation: table.rotation,
  label: table.label,
  round: table.shape === 'round',
  seats: table.seats,
  enabled: table.enabled,
});

/**
 * An object with the item's geometry written back on to it.
 *
 * Only the four geometry fields move. Everything else on the object is left
 * exactly as it was, because the canvas never learns about it and a spread of
 * the item over the object would quietly drop what it does not carry.
 */
export const objectWithItemGeometry = (
  object: FloorPlanObject,
  item: FloorPlanItem,
): FloorPlanObject => ({
  ...object,
  position: item.position,
  size: item.size,
  rotation: item.rotation,
});

/**
 * A table with the item's geometry written back on to it.
 *
 * A round table takes its diameter from the width alone. The two are held
 * equal by {@link resizeItem} and by every path that builds an item, so
 * reading one of them is a choice between two identical numbers rather than a
 * loss — and reading both would need a rule for which one wins.
 */
export const tableWithItemGeometry = (
  table: RestaurantTable,
  item: FloorPlanItem,
): RestaurantTable =>
  table.shape === 'round'
    ? {
        ...table,
        position: item.position,
        rotation: item.rotation,
        diameter: item.size.width,
      }
    : {
        ...table,
        position: item.position,
        rotation: item.rotation,
        size: item.size,
      };

/**
 * The same table drawn as the other shape (GitHub issue #1084).
 *
 * A shape change is geometry rather than business: the table keeps its id, its
 * label, its capacity and its service state, and only what it is drawn as
 * moves. The union is the point - a round table cannot keep a `size` it no
 * longer has a meaning for, and a rectangle cannot keep a `diameter`.
 *
 * The width is what becomes the diameter and what a diameter becomes again,
 * because the width is already the single side every other path reads for a
 * round table (see {@link tableWithItemGeometry}). Taking the height instead
 * would make a rectangle-round-rectangle round trip depend on which of two
 * numbers the code happened to prefer. The height of a rectangle made from a
 * round table is the diameter too, which is the square the circle was drawn in.
 */
export const tableWithShape = (
  table: RestaurantTable,
  shape: TableShape,
): RestaurantTable => {
  if (table.shape === shape) {
    return table;
  }

  const side = table.shape === 'round' ? table.diameter : table.size.width;

  // Field by field rather than by spreading `table`, because a spread would
  // carry the `size` or the `diameter` of the shape being left straight into
  // the shape being adopted, and the union exists to make that impossible.
  const base = {
    id: table.id,
    label: table.label,
    roomId: table.roomId,
    position: table.position,
    rotation: table.rotation,
    seats: table.seats,
    enabled: table.enabled,
    ...(table.qrTokenId === undefined ? {} : { qrTokenId: table.qrTokenId }),
  };

  return shape === 'round'
    ? { ...base, shape: 'round', diameter: side }
    : { ...base, shape: 'rectangle', size: { width: side, height: side } };
};
