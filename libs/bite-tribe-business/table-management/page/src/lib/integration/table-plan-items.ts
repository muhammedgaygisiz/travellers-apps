import {
  FloorPlanItem,
  itemFromObject,
  itemFromTable,
} from 'bite-tribe-business/floor-plan-ui';
import { RestaurantTable, Room, TableState, TableStatus } from 'model';
import { statusOfTable } from './table-plan-summary';

/**
 * The published plan with the service written on to it (GitHub issue #1093).
 *
 * The items are the editor's own - `itemFromObject` and `itemFromTable` from
 * issue #1083 - with three fields added per table. Reusing them rather than
 * building a second set is the point of the issue: a room laid out by the owner
 * and the same room read by a host at the door are recognisably one drawing,
 * and they are one drawing because they are one renderer.
 */

/** What the live view needs said about a table, already in the reader's language. */
export interface TableStatusCopy {
  label: string;
  /** How long the table has been in that status, or nothing when it says nothing. */
  duration?: string;
}

/**
 * The statuses whose clock is worth drawing on the plan.
 *
 * Everything but `available`. A free table has been free since whoever cleared
 * it last, and nobody is looking for that number; every other status is
 * something that started and is expected to end, so how long it has been
 * running is the question staff are actually scanning the room for - the table
 * awaiting payment for twenty minutes is the one they walk to next.
 */
export const isTimedStatus = (status: TableStatus): boolean =>
  status !== 'available';

/**
 * One room, drawn read-only with its live states.
 *
 * The geometry comes from the room and the tables come from the restaurant's
 * table documents filtered to that room, which is the same split the editor
 * reads: geometry lives inline in the room, and a table is its own document so
 * it keeps its identity when it moves between rooms.
 *
 * A table with no state document is drawn `available` rather than left blank,
 * through `tableStatusOf`, so a restaurant opening this view for the first time
 * sees a room full of free tables instead of a room of tables with nothing
 * said about them.
 */
export const liveRoomItems = (
  room: Room | undefined,
  tables: readonly RestaurantTable[],
  states: ReadonlyMap<string, TableState>,
  copy: (status: TableStatus, state: TableState | undefined) => TableStatusCopy,
  /**
   * How many orders the kitchen still owes each table (GitHub issue #1105).
   *
   * A map rather than a field on the table, because it comes from a different
   * listener with a different lifetime: the plan draws from the moment the
   * rooms load and the order count arrives whenever its own first snapshot
   * does. A table missing from the map has nothing outstanding, which is the
   * ordinary case and also what an empty map means before that snapshot - so a
   * plan opened a moment early draws no badges rather than a row of noughts.
   */
  openOrders: ReadonlyMap<string, number> = new Map(),
  /**
   * What each table is calling for, already in the reader's language
   * (GitHub issue #1106).
   *
   * A map for the reason the order counts are one, and translated for the
   * reason the status label is: the canvas is a `type:ui` library and holds no
   * vocabulary. A table missing from the map is not calling, which is the
   * ordinary case and also what an empty map means before the first delivery -
   * so a plan opened a moment early draws no markers rather than marking every
   * table.
   */
  assistance: ReadonlyMap<string, string> = new Map(),
): FloorPlanItem[] => {
  if (!room) {
    return [];
  }

  const objects = room.objects.map(itemFromObject);
  const roomTables = tables
    .filter((table) => table.roomId === room.id)
    .map((table) => {
      const state = states.get(table.id);
      const status = statusOfTable(table, states);
      const { label, duration } = copy(status, state);

      const orders = openOrders.get(table.id) ?? 0;
      const calling = assistance.get(table.id) ?? '';

      return {
        ...itemFromTable(table),
        status,
        statusLabel: label,
        ...(duration === undefined ? {} : { statusDuration: duration }),
        // Absent rather than `0`, so "no badge" is one state on the item
        // rather than two the canvas has to tell apart.
        ...(orders > 0 ? { openOrders: orders } : {}),
        // Absent rather than empty, for the same reason.
        ...(calling ? { assistanceLabel: calling } : {}),
      };
    });

  // Geometry first and tables second, so a table drawn over a counter or a
  // banquette stays readable. The editor stores them in the same two groups
  // for the same reason.
  return [...objects, ...roomTables];
};
