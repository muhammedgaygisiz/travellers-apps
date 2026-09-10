import { tableWithShape } from 'bite-tribe-business/floor-plan-ui';
import {
  FloorPlanPoint,
  Millimetres,
  RestaurantTable,
  TableShape,
} from 'model';
// A type-only import, so the two modules do not form a runtime cycle:
// the layout module reads `labelKey` from here.
import type { FloorPlanLayout } from './floor-plan-layout';

/**
 * What makes a table a business entity rather than a rectangle
 * (GitHub issue #1084).
 *
 * Everything here is a pure function over a {@link FloorPlanLayout} and the
 * labels already taken elsewhere in the restaurant, for the same reason the
 * geometry helpers are pure: the rules can be asserted without rendering a
 * canvas or reading Firestore, and the undo history keeps working because every
 * function returns a new layout rather than mutating one.
 *
 * ## Why the restaurant and not the room
 *
 * [[Table]] makes a label unique within the *restaurant*, including across
 * rooms, because staff say "table 12" without naming a room and a printed QR
 * sheet carries the number alone. The editor holds one room at a time, so every
 * function that touches a label takes the labels of the other rooms as well.
 */

/** A table nobody can sit at is not a table. */
export const MIN_TABLE_SEATS = 1;

/**
 * The largest capacity the editor accepts on one table.
 *
 * A banquet table for forty is a real thing; a typed `400` is a slipped
 * keystroke, and a capacity that large would distort every summary built on top
 * of it.
 */
export const MAX_TABLE_SEATS = 40;

/** Bulk numbering starts here when the owner types nothing. */
export const FIRST_TABLE_NUMBER = 1;

/**
 * How far apart two tables can sit vertically and still count as one row.
 *
 * Bulk numbering runs in reading order, and a row of tables an owner nudged by
 * hand is never at one exact `y`. A band roughly one table deep groups them the
 * way the eye does, so numbering a row left to right does not zigzag because
 * one table sits 40 mm higher than its neighbour.
 */
export const NUMBERING_ROW_BAND: Millimetres = 1000;

/** Why a label was refused. */
export type TableLabelIssue = 'empty' | 'duplicate';

/** A refused label, and the table that already holds it. */
export interface TableLabelConflict {
  issue: TableLabelIssue;
  /** The label as the owner typed it, so the message can quote it back. */
  label: string;
  /** The table already carrying the label, absent when the label was empty. */
  holder?: RestaurantTable;
}

/**
 * A label reduced to what makes two labels the same table number.
 *
 * Case-folded and trimmed, so `A1`, `a1` and ` a1 ` are one label rather than
 * three. Staff say them identically and a printed sheet cannot carry the
 * difference, so accepting all three would produce exactly the collision the
 * uniqueness rule exists to prevent - only invisibly.
 *
 * The comparison is folded; the stored label is not. An owner who types `A1`
 * gets `A1` on the plan and on the sheet.
 */
export const labelKey = (label: string): string =>
  label.trim().toLocaleLowerCase();

/** The label as it is stored: the owner's own text, without stray spaces. */
export const cleanLabel = (label: string): string => label.trim();

/**
 * Why a label cannot be given to a table, or `undefined` when it can.
 *
 * `tables` is every table of the restaurant, the one being renamed included -
 * it is skipped by id, so re-typing a table's own label is not a conflict.
 */
export const labelConflict = (
  label: string,
  tableId: string,
  tables: readonly RestaurantTable[],
): TableLabelConflict | undefined => {
  const cleaned = cleanLabel(label);

  if (cleaned.length === 0) {
    return { issue: 'empty', label };
  }

  const key = labelKey(cleaned);
  const holder = tables.find(
    (table) => table.id !== tableId && labelKey(table.label) === key,
  );

  return holder ? { issue: 'duplicate', label: cleaned, holder } : undefined;
};

/** Seating capacity as a whole number inside the accepted range. */
export const clampSeats = (seats: number): number =>
  Math.min(MAX_TABLE_SEATS, Math.max(MIN_TABLE_SEATS, Math.round(seats)));

/**
 * The layout with one table replaced by the result of `change`.
 *
 * Geometry is untouched by everything in this module: a label, a capacity and a
 * service state are facts about the table and never about where it stands, so
 * editing one cannot move a table and dragging a table cannot rename it.
 */
const withTable = (
  layout: FloorPlanLayout,
  tableId: string,
  change: (table: RestaurantTable) => RestaurantTable,
): FloorPlanLayout => ({
  ...layout,
  tables: layout.tables.map((table) =>
    table.id === tableId ? change(table) : table,
  ),
});

export const withTableLabel = (
  layout: FloorPlanLayout,
  tableId: string,
  label: string,
): FloorPlanLayout =>
  withTable(layout, tableId, (table) => ({
    ...table,
    label: cleanLabel(label),
  }));

export const withTableSeats = (
  layout: FloorPlanLayout,
  tableId: string,
  seats: number,
): FloorPlanLayout =>
  withTable(layout, tableId, (table) => ({
    ...table,
    seats: clampSeats(seats),
  }));

/**
 * The layout with one table standing in another room (GitHub issue #1085).
 *
 * The table is changed rather than replaced: its `id`, its `label`, its
 * capacity, its shape and its `qrTokenId` all survive, which is the whole point
 * of the move. [[Table]] requires it — a printed QR code carries the token, and
 * a code that stopped resolving because the owner carried the table on to the
 * terrace would have to be reprinted for a table that never changed.
 *
 * `position` is passed in rather than kept, because a room-relative coordinate
 * means something different in a different room: the caller clamps the centre
 * into the target room, so a table moved from a hall into a small terrace lands
 * on the terrace rather than beyond its far wall.
 *
 * The moved table stays in the layout. Dropping it here would make it
 * indistinguishable from a deleted one on the way to Firestore, and a save
 * would then delete the document the printed code points at.
 */
export const withTableRoom = (
  layout: FloorPlanLayout,
  tableId: string,
  roomId: string,
  position: FloorPlanPoint,
): FloorPlanLayout =>
  withTable(layout, tableId, (table) => ({ ...table, roomId, position }));

export const withTableEnabled = (
  layout: FloorPlanLayout,
  tableId: string,
  enabled: boolean,
): FloorPlanLayout =>
  withTable(layout, tableId, (table) => ({ ...table, enabled }));

/**
 * The layout with one table drawn as the other shape.
 *
 * The conversion itself is `tableWithShape` in the `ui` library, because which
 * side becomes a diameter is a fact about the drawing. What is decided here is
 * that a shape change keeps the table: its id, its label, its capacity and its
 * service state all survive, so switching a four-top from square to round does
 * not silently produce a different table.
 */
export const withTableShapeChanged = (
  layout: FloorPlanLayout,
  tableId: string,
  shape: TableShape,
): FloorPlanLayout =>
  withTable(layout, tableId, (table) => tableWithShape(table, shape));

/**
 * The selected tables, in the order a person reads a room.
 *
 * Top to bottom in bands, then left to right inside a band, with `y` breaking a
 * tie so the order is total and a renumber is repeatable.
 */
const inReadingOrder = (
  tables: readonly RestaurantTable[],
): RestaurantTable[] =>
  [...tables].sort((left, right) => {
    const band =
      Math.round(left.position.y / NUMBERING_ROW_BAND) -
      Math.round(right.position.y / NUMBERING_ROW_BAND);

    return band !== 0
      ? band
      : left.position.x - right.position.x ||
          left.position.y - right.position.y;
  });

/**
 * Consecutive numbers for the selected tables, starting at `start`.
 *
 * This is how a room of twenty tables gets its numbers: the owner duplicates
 * one table into a grid and then numbers the whole grid in one action, rather
 * than typing twenty labels into twenty panels.
 *
 * Numbers already held by tables the selection does not contain are skipped
 * rather than overwritten, so the helper cannot create the collision the label
 * rule refuses one at a time - the result is consecutive *free* numbers, which
 * is what an owner numbering a second room actually wants.
 *
 * `reserved` is the labels of the restaurant's other rooms. Geometry is not
 * touched, so numbering a selection never moves it.
 */
export const numberedTables = (
  layout: FloorPlanLayout,
  ids: readonly string[],
  start: number,
  reserved: readonly string[] = [],
): FloorPlanLayout => {
  const chosen = new Set(ids);
  const renumbered = inReadingOrder(
    layout.tables.filter((table) => chosen.has(table.id)),
  );

  if (renumbered.length === 0) {
    return layout;
  }

  const taken = new Set([
    ...layout.tables
      .filter((table) => !chosen.has(table.id))
      .map((table) => labelKey(table.label)),
    ...reserved.map(labelKey),
  ]);

  let next = Math.max(FIRST_TABLE_NUMBER, Math.round(start));
  const assigned = new Map<string, string>();

  renumbered.forEach((table) => {
    while (taken.has(labelKey(String(next)))) {
      next += 1;
    }

    assigned.set(table.id, String(next));
    taken.add(labelKey(String(next)));
    next += 1;
  });

  return {
    ...layout,
    tables: layout.tables.map((table) => {
      const label = assigned.get(table.id);

      return label ? { ...table, label } : table;
    }),
  };
};
