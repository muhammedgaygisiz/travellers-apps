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

      return {
        ...itemFromTable(table),
        status,
        statusLabel: label,
        ...(duration === undefined ? {} : { statusDuration: duration }),
      };
    });

  // Geometry first and tables second, so a table drawn over a counter or a
  // banquette stays readable. The editor stores them in the same two groups
  // for the same reason.
  return [...objects, ...roomTables];
};
