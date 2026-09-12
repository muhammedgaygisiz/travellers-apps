import {
  RestaurantTable,
  TABLE_STATUSES,
  TableState,
  TableStatus,
  tableStatusOf,
} from 'model';

/**
 * What the room adds up to, and which tables the counts are of
 * (GitHub issue #1093).
 *
 * Pure functions over the tables and the states the view already holds, for
 * the same reason the floor-plan layout helpers are: the rules can be asserted
 * without rendering a canvas or reading Firestore.
 */

/** One line of the summary bar. */
export interface TableStatusCount {
  status: TableStatus;
  count: number;
}

/**
 * The statuses the summary bar always shows, even at zero.
 *
 * These four are the shape of a service - what is free, what has people at it,
 * what is promised and what is being turned over - and a bar whose entries came
 * and went as the room changed would be a bar staff had to re-read rather than
 * glance at. The other three appear only when a table is actually in one,
 * because `ordering` and `awaitingPayment` are not reachable at all until the
 * QR ordering of issue #1072 and a permanent pair of zeros would be noise.
 */
export const SUMMARY_STATUSES: readonly TableStatus[] = [
  'available',
  'occupied',
  'reserved',
  'cleaning',
];

/**
 * The live state of each table, keyed by table id.
 *
 * A map rather than a list, because every lookup from here on is by table and a
 * room of forty tables would otherwise scan the states forty times per render.
 */
export const statesByTable = (
  states: readonly TableState[],
): ReadonlyMap<string, TableState> =>
  new Map(states.map((state) => [state.tableId, state]));

/**
 * The status of one table, whether or not it has a state document.
 *
 * Through `tableStatusOf` rather than defaulting here, so "no document means
 * available" stays the model's single decision (issue #1091).
 */
export const statusOfTable = (
  table: RestaurantTable,
  states: ReadonlyMap<string, TableState>,
): TableStatus => tableStatusOf(states.get(table.id));

/**
 * How many tables are in each status.
 *
 * Over the tables rather than over the state documents, which is the whole
 * reason it is not a `reduce` on the snapshot: a restaurant that has never used
 * this view has no state documents at all, and a count taken from them would
 * report an empty room instead of one where everything is free.
 */
export const statusCounts = (
  tables: readonly RestaurantTable[],
  states: ReadonlyMap<string, TableState>,
): Record<TableStatus, number> => {
  const counts = {
    available: 0,
    reserved: 0,
    occupied: 0,
    ordering: 0,
    awaitingPayment: 0,
    cleaning: 0,
    disabled: 0,
  };

  tables.forEach((table) => {
    counts[statusOfTable(table, states)] += 1;
  });

  return counts;
};

/**
 * The summary bar: the four named statuses, then whatever else the room is
 * actually doing.
 *
 * In that order rather than in lifecycle order, so the four that are always
 * present never move as the others appear and disappear beside them.
 */
export const summaryRows = (
  counts: Record<TableStatus, number>,
): TableStatusCount[] => {
  const named = SUMMARY_STATUSES.map((status) => ({
    status,
    count: counts[status],
  }));

  const rest = TABLE_STATUSES.filter(
    (status) => !SUMMARY_STATUSES.includes(status) && counts[status] > 0,
  ).map((status) => ({ status, count: counts[status] }));

  return [...named, ...rest];
};
