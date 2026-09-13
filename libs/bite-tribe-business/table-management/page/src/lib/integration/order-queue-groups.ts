import {
  allowedTableOrderStatusTransitions,
  MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH,
} from 'model';
import type { RestaurantTable, TableOrder, TableOrderStatus } from 'model';
import { elapsedParts, type ElapsedParts } from './table-status-duration';

/**
 * The incoming order queue, as rows a kitchen reads (GitHub issue #1105).
 *
 * Pure functions over the orders and the tables the view already holds, for the
 * reason `table-plan-summary.ts` is pure: the rules a queue lives by - which
 * table a row belongs to, how long it has been waiting, which buttons it may
 * offer - are assertable without rendering anything or reading Firestore.
 *
 * ## Grouped by table, and why the group is keyed by the table and not the visit
 *
 * A party that moves keeps its visit and changes its `tableId`, which is the
 * whole of issue #1095's `moveTableVisit`. The kitchen asks "what goes to table
 * 12", so the group is the *table the order was placed from* - the field the
 * order records precisely because it is the ticket's own answer. A party moved
 * mid-meal therefore leaves its earlier round under the table it was ordered
 * from, which is where the plates were already heading, and its next round
 * appears under the new one.
 *
 * ## Which status words this file does not hold
 *
 * None of them. Every label is a Transloco key chosen here and filled in by the
 * caller, the same split `elapsedParts` and `tableStatusMark` already use: the
 * same status is named in the queue, on the plan and in the guest's app, and a
 * second English sentence in a library would be a second thing to translate.
 */

/** The longest cancellation reason the queue will send. The model's own cap. */
export const MAX_CANCELLATION_REASON =
  MAX_TABLE_ORDER_CANCELLATION_REASON_LENGTH;

/**
 * The sentence each order status is told with, in the business app.
 *
 * A table rather than a key built from a prefix in the template, for the reason
 * the guest app's `TABLE_ORDER_STATUS_KEYS` is one: a status the model gains
 * and no locale file covers is then a compile error here rather than a blank
 * word beside a dish somebody is waiting for.
 */
export const ORDER_STATUS_KEYS: Readonly<Record<TableOrderStatus, string>> = {
  submitted: 'order-status-submitted',
  accepted: 'order-status-accepted',
  preparing: 'order-status-preparing',
  served: 'order-status-served',
  cancelled: 'order-status-cancelled',
} as const;

/**
 * What each move is called on the button that makes it.
 *
 * Separate from {@link ORDER_STATUS_KEYS} because a status and an action are
 * different words: the row says "Accepted" and the button says "Accept". One
 * table doing both would have a kitchen pressing a past tense.
 */
export const ORDER_ACTION_KEYS: Readonly<Record<TableOrderStatus, string>> = {
  submitted: 'order-action-submitted',
  accepted: 'order-action-accept',
  preparing: 'order-action-preparing',
  served: 'order-action-served',
  cancelled: 'order-action-cancel',
} as const;

/** One thing a staff member may do to one order. */
export interface OrderAction {
  /** The status the order moves into. */
  to: TableOrderStatus;
  labelKey: string;
  /** Whether picking it has to ask for a reason first. */
  needsReason: boolean;
}

/** One line of an order, ready to render. */
export interface QueuedOrderLine {
  name: string;
  /** The variant, where the dish has one. */
  variantName?: string;
  quantity: number;
  /** What the guest asked for. The line a kitchen actually has to read. */
  notes?: string;
}

/** One order, as a row of the queue. */
export interface QueuedOrder {
  id: string;
  visitId: string;
  status: TableOrderStatus;
  statusKey: string;
  /** How long since the guest sent it, as a sentence to translate. */
  waiting: ElapsedParts;
  /** True once it has been waiting longer than {@link URGENT_AFTER_MS}. */
  urgent: boolean;
  lines: QueuedOrderLine[];
  total: number;
  currency: string;
  /** The moves the matrix allows from here, in the order they are reached for. */
  actions: OrderAction[];
}

/** One table's open orders. */
export interface OrderTableGroup {
  tableId: string;
  /** The table's number as staff call it. Empty where the table has gone. */
  label: string;
  orders: QueuedOrder[];
  /** How long the oldest order in the group has been waiting. */
  oldest: ElapsedParts;
  /** True when any order in the group is {@link QueuedOrder.urgent}. */
  urgent: boolean;
}

/**
 * When an order stops being ordinary and starts being a problem.
 *
 * Twelve minutes, which is roughly when a table that ordered a starter starts
 * looking at the kitchen door. It is a *display* threshold and nothing else -
 * nothing is escalated, refused or reordered by it; a row simply starts saying
 * so, because a queue where every row looks the same is a queue where the one
 * that has been sitting there since before the rush is invisible.
 */
export const URGENT_AFTER_MS = 12 * 60_000;

/**
 * The actions one order offers, derived from the matrix and never listed
 * beside it.
 *
 * Exactly the argument `tableActions` makes for a table: a hand-written list
 * of buttons per status is a second copy of the state machine, and the copy
 * that drifts is the one nobody tests against the backend - which shows up as
 * a button that does nothing in the middle of a service.
 *
 * Cancelling is the one move that has to ask before it acts, and it says so
 * here rather than in the component, so a screen cannot forget to and send a
 * cancellation the backend then refuses for having no reason.
 */
export const orderActions = (status: TableOrderStatus): OrderAction[] =>
  allowedTableOrderStatusTransitions(status).map((to) => ({
    to,
    labelKey: ORDER_ACTION_KEYS[to],
    needsReason: to === 'cancelled',
  }));

const toLine = (line: TableOrder['lines'][number]): QueuedOrderLine => ({
  name: line.name,
  quantity: line.quantity,
  ...(line.variantName ? { variantName: line.variantName } : {}),
  ...(line.notes ? { notes: line.notes } : {}),
});

/** One order, as the queue renders it. */
export const toQueuedOrder = (order: TableOrder, now: number): QueuedOrder => ({
  id: order.id,
  visitId: order.visitId,
  status: order.status,
  statusKey: ORDER_STATUS_KEYS[order.status],
  waiting: elapsedParts(order.submittedAt, now),
  urgent: now - order.submittedAt >= URGENT_AFTER_MS,
  lines: (order.lines ?? []).map(toLine),
  total: order.total,
  currency: order.currency,
  actions: orderActions(order.status),
});

/**
 * The queue, grouped by table.
 *
 * **Newest first, twice.** The orders of a table are newest first, and the
 * tables are ordered by their newest order - which is what the issue asks for
 * and what a pass actually wants: the thing that just arrived is the thing
 * nobody has looked at yet, and everything already accepted has somebody
 * working on it. The age is on every row and the group carries its oldest, so
 * the round that has been sitting there since before the rush is still the
 * loudest thing in its group rather than something staff have to scroll for.
 *
 * A table that has been deleted from the floor plan since the order was placed
 * still gets a group, with an empty label. Dropping the group would lose an
 * order somebody is waiting for in order to tidy up a number; the screen names
 * it as an unknown table instead.
 */
export const groupOrdersByTable = (
  orders: readonly TableOrder[],
  tables: readonly RestaurantTable[],
  now: number,
): OrderTableGroup[] => {
  const labels = new Map(tables.map((table) => [table.id, table.label]));
  const groups = new Map<string, TableOrder[]>();

  orders.forEach((order) => {
    const group = groups.get(order.tableId);

    if (group) {
      group.push(order);

      return;
    }

    groups.set(order.tableId, [order]);
  });

  return [...groups.entries()]
    .map(([tableId, tableOrders]) => {
      const sorted = [...tableOrders].sort(
        (first, second) => second.submittedAt - first.submittedAt,
      );
      const queued = sorted.map((order) => toQueuedOrder(order, now));

      return {
        // The instant the group is sorted by, kept beside the group rather
        // than read back off it: the group carries `ElapsedParts`, which is a
        // sentence, and sorting sentences by the time they describe is how a
        // "2 h 5 min" ends up above a "3 min".
        newestAt: sorted[0].submittedAt,
        group: {
          tableId,
          label: labels.get(tableId) ?? '',
          orders: queued,
          oldest: elapsedParts(sorted[sorted.length - 1].submittedAt, now),
          urgent: queued.some((order) => order.urgent),
        },
      };
    })
    .sort(
      (first, second) =>
        second.newestAt - first.newestAt ||
        first.group.label.localeCompare(second.group.label),
    )
    .map((entry) => entry.group);
};

/** How many open orders the queue is holding, across every table. */
export const openOrderCount = (groups: readonly OrderTableGroup[]): number =>
  groups.reduce((count, group) => count + group.orders.length, 0);

/**
 * How many open orders each table has, keyed by table id
 * (GitHub issue #1105).
 *
 * What the floor plan draws. A count rather than a list, because the plan is
 * read from across a room and what it has to answer there is "which tables are
 * the kitchen still working on" - the detail is one tap away in the queue.
 */
export const openOrdersByTable = (
  orders: readonly TableOrder[],
): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();

  orders.forEach((order) =>
    counts.set(order.tableId, (counts.get(order.tableId) ?? 0) + 1),
  );

  return counts;
};
