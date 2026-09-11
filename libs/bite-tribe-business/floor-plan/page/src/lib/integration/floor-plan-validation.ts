import { itemBounds, itemFromTable } from 'bite-tribe-business/floor-plan-ui';
import { RestaurantTable, Room } from 'model';
import type { FloorPlanLayout } from './floor-plan-layout';
import { MIN_TABLE_SEATS, cleanLabel, labelKey } from './floor-plan-tables';

/**
 * What has to be true of a plan before it is published
 * (GitHub issue #1088).
 *
 * Everything here is a pure function over a layout, the room it is drawn in
 * and the tables of the restaurant's other rooms, for the same reason the
 * geometry and table helpers are pure: the rules can be asserted without
 * rendering a canvas or reading Firestore.
 *
 * ## Why validate at all, when the editor already refuses these
 *
 * A duplicate label is refused as it is typed, capacity is clamped, and a
 * centre is clamped into the room on every placement and drag. So this module
 * exists for the plans that reached a bad state some other way, and there are
 * three real ones:
 *
 * - A room that was made smaller. Resizing a room moves nothing standing in
 *   it, so shrinking a hall can leave a table beyond its new wall.
 * - A second device. Two editors arranging two rooms cannot see each other's
 *   unpublished tables, so both can produce a table 12 ([[Table]]).
 * - A draft that outlived the rule that refused it. A draft is stored and
 *   reopened later, and the rules the editor enforces have changed before.
 *
 * ## Errors and warnings
 *
 * An error blocks publishing, because the plan would be wrong in a way
 * something downstream cannot recover from: a QR sheet cannot print a table
 * with no number, a scan cannot resolve one of two tables called 12, and a
 * table outside its room is not in the room staff are told to look in.
 *
 * A warning does not block, and overlapping tables are the reason the two
 * severities exist. Real dining rooms have tables pushed together for a party
 * of ten, a bench a table sits half under, and a bar counter a stool tucks
 * into. Refusing those would make the editor argue with the room it is
 * describing.
 */

/** Whether a finding stops a publish or only remarks on it. */
export type FloorPlanIssueSeverity = 'error' | 'warning';

/**
 * What is wrong with one table.
 *
 * A code rather than a message, so the copy lives in the locale file and the
 * rules live here. Each one names a table, because a finding an owner cannot
 * jump to is a finding they have to hunt for.
 */
export type FloorPlanIssueCode =
  | 'label-empty'
  | 'label-duplicate'
  | 'seats-too-few'
  | 'table-outside-room'
  | 'table-overhangs-room'
  | 'tables-overlap';

/** One thing wrong with one table, and what else it involves. */
export interface FloorPlanIssue {
  severity: FloorPlanIssueSeverity;
  code: FloorPlanIssueCode;
  /** The table the finding is about, and the one a jump selects. */
  tableId: string;
  /** Its label, so a message can name it even when the label is the problem. */
  label: string;
  /** The room it stands in, so a jump can open that room first. */
  roomId: string;
  /** The other table involved, for a duplicate label or an overlap. */
  otherTableId?: string;
  otherLabel?: string;
  /** The room the other table stands in, which may not be the open one. */
  otherRoomId?: string;
}

/** Every finding about one plan, and whether it can be published. */
export interface FloorPlanValidation {
  errors: FloorPlanIssue[];
  warnings: FloorPlanIssue[];
  /** False when anything blocks. Publishing with a blocking error is refused. */
  publishable: boolean;
}

export const EMPTY_VALIDATION: FloorPlanValidation = {
  errors: [],
  warnings: [],
  publishable: true,
};

/** The plan a publish is being asked for. */
export interface FloorPlanValidationInput {
  /** The room being published, at the dimensions the owner has given it. */
  room: Room;
  /** The arrangement in the editor, which is what would be published. */
  layout: FloorPlanLayout;
  /**
   * The stored tables of the restaurant's other rooms.
   *
   * Needed because [[Table]] makes a label unique across the restaurant, and a
   * uniqueness rule cannot be checked against tables that were never loaded.
   */
  otherTables: readonly RestaurantTable[];
}

/**
 * Whether two axis-aligned boxes share any area.
 *
 * Touching edges do not count. A row of tables pushed flush against each other
 * is a deliberate arrangement, and warning about it would train the owner to
 * ignore the warnings that matter.
 */
const overlaps = (
  left: { left: number; top: number; right: number; bottom: number },
  right: { left: number; top: number; right: number; bottom: number },
): boolean =>
  left.left < right.right &&
  right.left < left.right &&
  left.top < right.bottom &&
  right.top < left.bottom;

/**
 * The findings about one table's identity: its number and its capacity.
 *
 * The duplicate check runs against every table of the restaurant, and reports
 * the finding on the *later* of the two so a pair produces one finding rather
 * than two that each blame the other.
 */
const identityIssues = (
  table: RestaurantTable,
  index: number,
  all: readonly RestaurantTable[],
): FloorPlanIssue[] => {
  const issues: FloorPlanIssue[] = [];
  const base = { tableId: table.id, label: table.label, roomId: table.roomId };

  if (cleanLabel(table.label).length === 0) {
    issues.push({ ...base, severity: 'error', code: 'label-empty' });
  } else {
    const key = labelKey(table.label);
    const holder = all.find(
      (other, otherIndex) =>
        otherIndex < index && labelKey(other.label) === key,
    );

    if (holder) {
      issues.push({
        ...base,
        severity: 'error',
        code: 'label-duplicate',
        otherTableId: holder.id,
        otherLabel: holder.label,
        otherRoomId: holder.roomId,
      });
    }
  }

  if (!Number.isFinite(table.seats) || table.seats < MIN_TABLE_SEATS) {
    issues.push({ ...base, severity: 'error', code: 'seats-too-few' });
  }

  return issues;
};

/**
 * The findings about where one table stands.
 *
 * A centre outside the room is an error: the table is not in the room, and no
 * reading of "table 12 is in the terrace" survives that. Bounds crossing the
 * outline are a warning, because that is a table against a wall or in a
 * doorway, which is the same rule the editor's own clamp follows - a shape
 * whose centre is on the floor is on the floor, and a bar counter is allowed
 * to overhang the wall it is built into (see `floor-plan-geometry.ts`).
 */
const placementIssues = (
  table: RestaurantTable,
  room: Room,
): FloorPlanIssue[] => {
  const base = { tableId: table.id, label: table.label, roomId: table.roomId };
  const { position } = table;

  if (
    position.x < 0 ||
    position.y < 0 ||
    position.x > room.size.width ||
    position.y > room.size.height
  ) {
    return [{ ...base, severity: 'error', code: 'table-outside-room' }];
  }

  const bounds = itemBounds(itemFromTable(table));

  return bounds.left < 0 ||
    bounds.top < 0 ||
    bounds.right > room.size.width ||
    bounds.bottom > room.size.height
    ? [{ ...base, severity: 'warning', code: 'table-overhangs-room' }]
    : [];
};

/**
 * Which tables sit on top of each other.
 *
 * Compared as the axis-aligned boxes the canvas already computes, rotation and
 * round shapes included. Two tables standing at an angle can have overlapping
 * boxes without touching, which is exactly why this is a warning: the answer
 * is "look at these two", not "you may not publish this".
 *
 * Each pair is reported once, on the later table.
 */
const overlapIssues = (
  tables: readonly RestaurantTable[],
): FloorPlanIssue[] => {
  const boxes = tables.map((table) => itemBounds(itemFromTable(table)));

  return tables.flatMap((table, index) =>
    tables
      .slice(0, index)
      .flatMap((other, otherIndex) =>
        overlaps(boxes[index], boxes[otherIndex])
          ? [
              {
                severity: 'warning' as const,
                code: 'tables-overlap' as const,
                tableId: table.id,
                label: table.label,
                roomId: table.roomId,
                otherTableId: other.id,
                otherLabel: other.label,
                otherRoomId: other.roomId,
              },
            ]
          : [],
      )
      // One finding per table however many things it sits on: an owner who
      // pushed four tables together would otherwise get six warnings about one
      // arrangement they made on purpose.
      .slice(0, 1),
  );
};

/**
 * Everything wrong with a plan, and whether it may be published.
 *
 * The tables of the open room come from the layout rather than from Firestore,
 * because the layout is what a publish would write. The other rooms' tables
 * come from storage, because they are already published and only their labels
 * are relevant here.
 *
 * Geometry is not validated. A wall half outside the room is a wall of the
 * room, a decoration on top of a table is a plant on a table, and there is no
 * downstream reader of geometry that a bad one could break.
 */
export const validateFloorPlan = (
  input: FloorPlanValidationInput,
): FloorPlanValidation => {
  const { room, layout, otherTables } = input;
  const roomTables = layout.tables.filter((table) => table.roomId === room.id);
  // Ordered with the open room's tables last, so a duplicate is reported on the
  // table the owner is looking at rather than on one in a room they cannot see.
  const everyTable = [...otherTables, ...roomTables];

  const issues = [
    ...everyTable.flatMap((table, index) =>
      // A table of another room is checked for the label collision it causes
      // here and nothing else: its capacity and its position were validated
      // when *it* was published.
      table.roomId === room.id
        ? [
            ...identityIssues(table, index, everyTable),
            ...placementIssues(table, room),
          ]
        : [],
    ),
    ...overlapIssues(roomTables),
  ];

  const errors = issues.filter((issue) => issue.severity === 'error');

  return {
    errors,
    warnings: issues.filter((issue) => issue.severity === 'warning'),
    publishable: errors.length === 0,
  };
};
