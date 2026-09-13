import { isOpenAssistanceRequest } from 'model';
import type {
  RestaurantTable,
  TableAssistanceKind,
  TableAssistanceRequest,
} from 'model';
import { elapsedParts, type ElapsedParts } from './table-status-duration';

/**
 * The tables that are calling, as rows a floor reads (GitHub issue #1106).
 *
 * Pure functions over the signals and the tables the view already holds, for
 * the reason `order-queue-groups.ts` is pure: the rules a call-list lives by -
 * which table is asking, for what, how long it has been asking, when it stops
 * being ordinary - are assertable without rendering anything or reading
 * Firestore.
 *
 * ## Which words this file does not hold
 *
 * None of them. Every label is a Transloco key chosen here and filled in by
 * the caller, the same split `elapsedParts` and `orderActions` already use.
 */

/**
 * What each kind is called on the row that shows it.
 *
 * A table rather than a key built from a prefix in the template, for the
 * reason `ORDER_STATUS_KEYS` is one: a kind the model gains and no locale file
 * covers is then a compile error here rather than a blank word beside a table
 * that is waving.
 */
export const ASSISTANCE_KIND_KEYS: Readonly<
  Record<TableAssistanceKind, string>
> = {
  callStaff: 'assistance-kind-callStaff',
  requestBill: 'assistance-kind-requestBill',
} as const;

/**
 * When a table that is calling stops being ordinary and starts being a
 * problem.
 *
 * Three minutes, and deliberately far shorter than the twelve an order gets.
 * They measure different things: an order is waiting on a kitchen that is
 * cooking it, and a raised hand is waiting on nobody at all. A table that has
 * been asking for three minutes in a room with staff in it has been walked
 * past.
 *
 * A *display* threshold and nothing else. Nothing is escalated, refused or
 * reordered by it; the row says so, because a list where every row looks the
 * same is a list where the table that has been calling since before the rush
 * is invisible.
 */
export const ASSISTANCE_URGENT_AFTER_MS = 3 * 60_000;

/** One table's call for somebody, as a row. */
export interface AssistanceRow {
  /** `{tableId}:{kind}`, so a table calling for both has two stable rows. */
  id: string;
  tableId: string;
  /** The table's number as staff call it. Empty where the table has gone. */
  label: string;
  kind: TableAssistanceKind;
  kindKey: string;
  /** How long since the guest asked, as a sentence to translate. */
  waiting: ElapsedParts;
  /** True once it has been waiting longer than {@link ASSISTANCE_URGENT_AFTER_MS}. */
  urgent: boolean;
  /** True when the guest has tapped again since raising it. */
  askedAgain: boolean;
}

/**
 * The open signals, oldest first, with their table numbers written on.
 *
 * **Oldest first, which is the opposite of the order queue.** A queue of
 * tickets is worked from the newest, because the thing that just arrived is
 * the thing nobody has looked at; a list of people waiting is worked from
 * whoever has waited longest, which is the only fair order to answer a room
 * in. The two lists sit on one screen and sort in opposite directions, and
 * that is the difference between a kitchen and a dining room rather than an
 * inconsistency.
 *
 * Acknowledged signals are dropped here rather than at the listener, because
 * the collection keeps them at their derived names: what the floor still owes
 * and what the collection holds are two different questions.
 *
 * A table deleted from the floor plan since the guest asked still gets a row,
 * with an empty label. Dropping it would lose somebody who is waiting in order
 * to tidy up a number; the screen names it as an unknown table instead, as the
 * order queue does.
 */
export const assistanceRows = (
  requests: readonly TableAssistanceRequest[],
  tables: readonly RestaurantTable[],
  now: number,
): AssistanceRow[] => {
  const labels = new Map(tables.map((table) => [table.id, table.label]));

  return (
    requests
      .filter((request) => isOpenAssistanceRequest(request))
      // Sorted on the instant rather than on the row, because the row carries
      // `ElapsedParts`, which is a sentence - and sorting sentences by the
      // time they describe is how a "2 h 5 min" ends up under a "3 min".
      .sort((first, second) => first.requestedAt - second.requestedAt)
      .map((request) => ({
        id: `${request.tableId}:${request.kind}`,
        tableId: request.tableId,
        label: labels.get(request.tableId) ?? '',
        kind: request.kind,
        kindKey: ASSISTANCE_KIND_KEYS[request.kind],
        waiting: elapsedParts(request.requestedAt, now),
        urgent: now - request.requestedAt >= ASSISTANCE_URGENT_AFTER_MS,
        // `lastRequestedAt` moves on a repeated tap and `requestedAt` does
        // not, which is what stops tapping pushing a table up a list sorted by
        // who has waited longest. The difference is still worth showing: a
        // guest who asked twice is a guest who thinks nobody heard them.
        askedAgain: request.lastRequestedAt > request.requestedAt,
      }))
  );
};

/**
 * Which kinds each table is calling for, keyed by table id.
 *
 * What the floor plan draws. The kinds rather than a count, because the plan is
 * read from across a room and "table 12 wants to pay" and "table 12 wants
 * somebody" are two different walks - unlike the order badge next to it, where
 * how many is the whole question and what they are is one press away.
 *
 * A table with nothing open is absent from the map rather than present with an
 * empty list, so the canvas has one state for "no marker" instead of two.
 */
export const openAssistanceKindsByTable = (
  requests: readonly TableAssistanceRequest[],
): ReadonlyMap<string, TableAssistanceKind[]> => {
  const byTable = new Map<string, TableAssistanceKind[]>();

  requests
    .filter((request) => isOpenAssistanceRequest(request))
    .forEach((request) => {
      const kinds = byTable.get(request.tableId);

      if (kinds) {
        if (!kinds.includes(request.kind)) {
          kinds.push(request.kind);
        }

        return;
      }

      byTable.set(request.tableId, [request.kind]);
    });

  return byTable;
};
