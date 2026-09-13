import type { TableStatus } from './table-state';

/**
 * The two things a guest at a table needs a waiter for (GitHub issue #1106).
 *
 * ## What a signal is
 *
 * Not a message and not an order. A guest taps once, a marker appears on the
 * room view and in the order queue, a member of staff acknowledges it and it
 * goes. The whole of it is "table 12 wants somebody" and "table 12 wants to
 * pay" - which is what waving across a dining room means, made visible on the
 * screen the floor is already being read from.
 *
 * ## Why the id is derived and what that buys
 *
 * ```text
 * /restaurants/{restaurantId}/assistanceRequests/{n}_{tableId}_{kind}
 * ```
 *
 * One document per table per kind, named rather than generated, exactly as
 * `tableSessionId` names one guest at one table. Three things follow from it
 * and each of them is a thing not built:
 *
 * **Repeated taps cannot make repeated signals.** The second tap addresses the
 * document the first one wrote. That is an acceptance criterion of this issue
 * satisfied by the address rather than by a check a later caller could forget,
 * and it holds across devices: two guests at one table asking for the bill are
 * one bill.
 *
 * **The collection is bounded by the room.** Two documents per table, forever.
 * So the staff view reads the whole collection with no `where`, no composite
 * index and no collection-group rule - which is the machinery the order queue
 * of issue #1105 needed because orders hang from the visit and are unbounded.
 *
 * **The guest can subscribe to the answer.** Their phone knows the restaurant,
 * the table and the kind, so it derives the name and watches the document -
 * the same trick that lets it watch its own session, and the reason "received,
 * then acknowledged" is a listener rather than a poll.
 *
 * What it costs is history: a new request of the same kind at the same table
 * replaces the acknowledged one before it. That is the right trade for a
 * signal. The one durable consequence a request has - the table moving to
 * `awaitingPayment` - is recorded where every other table movement is, in
 * `tableStateTransitions`, which nothing overwrites.
 *
 * ## Why it is not under the visit
 *
 * An order is money and hangs from the party, so a party that moves keeps it
 * (`RD-TS-9`). A signal is geography: it means *come to this table*, and a
 * party walked to another table wants somebody at the new one. So it hangs
 * from the table, and a move leaves it behind - which is correct, and is the
 * opposite of what the same choice would mean for an order.
 */

/**
 * What the guest is asking for.
 *
 * A closed set of two rather than free text, and it will stay small. The whole
 * value of the signal is that it is readable across a room at a glance; a
 * guest who needs to say something specific is a guest who needs a person,
 * which is what `callStaff` fetches.
 */
export const TABLE_ASSISTANCE_KINDS = [
  /** Somebody is wanted at the table. */
  'callStaff',
  /**
   * The party would like to pay.
   *
   * The one kind with a consequence beyond the marker: it moves the table to
   * `awaitingPayment`, because a party that has asked for the bill has stopped
   * ordering and the floor should say so without anyone retyping it.
   */
  'requestBill',
] as const;

/** What one signal is asking for. */
export type TableAssistanceKind = (typeof TABLE_ASSISTANCE_KINDS)[number];

/**
 * Every status a signal can hold.
 *
 * Two, and there is no third. A signal is not cancelled by the guest - a party
 * that changes its mind tells the person who turns up - and it is not
 * "resolved" separately from being acknowledged, because acknowledging it *is*
 * a member of staff saying they have seen it and are dealing with it. A third
 * status would be a second tap for the same person to remember.
 */
export const TABLE_ASSISTANCE_STATUSES = [
  /** Raised, and nobody has said they have seen it. */
  'open',
  /** A member of staff took it. The marker goes, on every device. */
  'acknowledged',
] as const;

export type TableAssistanceStatus = (typeof TABLE_ASSISTANCE_STATUSES)[number];

/** The status every signal starts in. */
export const INITIAL_TABLE_ASSISTANCE_STATUS: TableAssistanceStatus = 'open';

/** One subcollection per restaurant, beside the live table states. */
export const TABLE_ASSISTANCE_REQUESTS_COLLECTION = 'assistanceRequests';

/**
 * The document name for one kind of signal at one table.
 *
 * Derived rather than generated, which is the whole rate limit - see the note
 * at the top of this file. The leading length is what makes the derivation
 * injective, for the same reason `tableSessionId` carries one: without it a
 * table called `x_callStaff` asking for the bill and a table called `x` asking
 * for staff would be one document. A kind contains no underscore, so the
 * length of the table id is enough to split the name back apart.
 */
export const tableAssistanceRequestId = (
  tableId: string,
  kind: TableAssistanceKind,
): string => `${tableId.length}_${tableId}_${kind}`;

/**
 * How long after raising one signal the same table may raise it again.
 *
 * The second half of the rate limit, and the half the derived id cannot
 * provide. Without it a guest could tap, wait for a member of staff to
 * acknowledge, and tap again - which is a way to keep a marker on the room
 * view indefinitely with two taps a minute, and is exactly "one impatient
 * guest flooding the room view".
 *
 * A minute, measured from when the signal was raised rather than from when it
 * was acknowledged. Measuring from the acknowledgement would punish the
 * restaurant for being quick: a waiter who takes a request within ten seconds
 * would lock the table out for the following minute, while one who ignores it
 * for five would not. Measured from the request, a guest whose waiter never
 * came can ask again a minute later, which is roughly when a person would.
 */
export const TABLE_ASSISTANCE_COOLDOWN_MS = 60_000;

/**
 * How many accounts one signal records as having asked for it.
 *
 * The field exists so the guest may read the document back - the rules admit
 * whoever is in it - and a party is a handful of phones. The cap is what stops
 * a table left open all evening accumulating a list; the guests past it still
 * raise the signal, they simply watch it through the screen they raised it
 * from rather than through a listener that survives a reload.
 */
export const MAX_TABLE_ASSISTANCE_REQUESTERS = 20;

/**
 * The table statuses a signal may be raised from.
 *
 * The three that mean a party is sitting there. A table being cleaned, taken
 * out of service, merely reserved or free means the floor and the session
 * disagree, and a marker drawn on it would send somebody to an empty table.
 *
 * `awaitingPayment` is in the list, and it is the one place this deliberately
 * differs from the statuses an order may be placed from: a party that has asked
 * for the bill has stopped ordering and has *not* stopped needing a waiter -
 * the commonest thing that happens next is that nobody comes and they ask
 * again.
 */
export const ATTENDED_TABLE_STATUSES: readonly TableStatus[] = [
  'occupied',
  'ordering',
  'awaitingPayment',
];

/**
 * The status a table holds once the bill has been asked for.
 *
 * Written as data rather than as a literal in the callable, because it is a
 * product rule about what a request *means* rather than a step of how one is
 * stored - and because the staff queue predicts it when it decides what to say
 * about a table whose bill was requested.
 */
export const TABLE_STATUS_AFTER_BILL_REQUEST: TableStatus = 'awaitingPayment';

/** One signal, as the restaurant sees it. */
export interface TableAssistanceRequest {
  /** Equal to the document id, which is {@link tableAssistanceRequestId}. */
  id: string;
  /** The owning restaurant, repeated from the path so a reader can trust it. */
  restaurantId: string;
  /** The table somebody is wanted at. The signal is about this, not a party. */
  tableId: string;
  /**
   * The visit the party was on when they raised it, where there was one.
   *
   * A record rather than an address: the document lives under the restaurant
   * and is named after the table, so nothing reads this to find it. It is here
   * because "which party asked" is the question staff ask next, and because a
   * signal raised on a visit that has since been closed is stale in a way the
   * status alone does not say.
   */
  visitId?: string;
  kind: TableAssistanceKind;
  status: TableAssistanceStatus;
  /** When the signal went up, in epoch milliseconds. The age staff read. */
  requestedAt: number;
  /**
   * The most recent tap that landed on this signal.
   *
   * Equal to {@link requestedAt} on a new one rather than absent. It exists so
   * a repeated tap is not silently lost - the guest is told the signal is
   * already up, and the restaurant can see that they asked twice - without the
   * age of the marker resetting, which would let repeated taps push a table
   * back to the top of a queue sorted by waiting longest.
   */
  lastRequestedAt: number;
  /**
   * The accounts that asked, in the order they did, capped at
   * {@link MAX_TABLE_ASSISTANCE_REQUESTERS}.
   *
   * A list rather than one uid because a signal belongs to a table and a table
   * has several phones at it. It is also the reader list: `firestore.rules`
   * admits a guest to this document when their uid is in here, which is what
   * makes "the guest sees that their request was received and then
   * acknowledged" a subscription rather than a callable.
   */
  requestedByUserIds: string[];
  /** When a member of staff took it. Absent while it is `open`. */
  acknowledgedAt?: number;
  /** Who took it. Absent while it is `open`. */
  acknowledgedByUserId?: string;
}

/** Whether an unknown value is a kind this model knows. */
export const isTableAssistanceKind = (
  value: unknown,
): value is TableAssistanceKind =>
  typeof value === 'string' &&
  (TABLE_ASSISTANCE_KINDS as readonly string[]).includes(value);

/** Whether an unknown value is a signal status this model knows. */
export const isTableAssistanceStatus = (
  value: unknown,
): value is TableAssistanceStatus =>
  typeof value === 'string' &&
  (TABLE_ASSISTANCE_STATUSES as readonly string[]).includes(value);

/**
 * Whether this signal is still asking for somebody.
 *
 * The predicate every reader filters by, because the collection keeps
 * acknowledged documents at their derived names rather than deleting them -
 * so "what is in the collection" and "what the floor still owes" are two
 * different questions and only one of them is drawn.
 */
export const isOpenAssistanceRequest = (
  request: Pick<TableAssistanceRequest, 'status'>,
): boolean => request.status === 'open';

/**
 * The open signals of one restaurant, grouped by the table they name.
 *
 * One function rather than a group in each of the two places that draw them:
 * the room view badges a table and the queue lists them above the tickets, and
 * two groupings of one collection are two chances to disagree about which
 * tables are calling.
 *
 * The values keep the order they arrived in, which callers sort; an empty
 * table is absent from the map rather than present with an empty list, so the
 * canvas has one state for "no marker" instead of two.
 */
export const openAssistanceByTable = (
  requests: readonly TableAssistanceRequest[],
): ReadonlyMap<string, TableAssistanceRequest[]> => {
  const byTable = new Map<string, TableAssistanceRequest[]>();

  for (const request of requests) {
    if (!isOpenAssistanceRequest(request)) {
      continue;
    }

    const existing = byTable.get(request.tableId);

    if (existing) {
      existing.push(request);
    } else {
      byTable.set(request.tableId, [request]);
    }
  }

  return byTable;
};

/**
 * Why a signal was not raised.
 *
 * A closed list for the reason `TABLE_ORDER_REFUSAL_REASONS` is one: each of
 * these asks something different of the guest, and "something went wrong" at a
 * table is a guest putting their phone down and waving after all.
 */
export const TABLE_ASSISTANCE_REFUSAL_REASONS = [
  /** The guest has no session at this table. They never scanned, or it went. */
  'sessionNotFound',
  /** The session is `pending`, `left` or `closed`. */
  'sessionNotActive',
  /** The session went idle past the restaurant's timeout. */
  'sessionExpired',
  /** The visit ended under the session. The party is no longer at the table. */
  'visitClosed',
  /**
   * The floor says nobody is sitting there.
   *
   * The table is free, reserved, being cleaned or out of service. The session
   * and the floor disagree, and a marker drawn on that table would send a
   * member of staff to an empty one.
   */
  'tableNotAttended',
  /**
   * Asked for again too soon.
   *
   * Not an error and not the guest doing anything wrong - the first signal was
   * dealt with and this one is inside {@link TABLE_ASSISTANCE_COOLDOWN_MS} of
   * it. The answer carries {@link TableAssistanceRefused.retryAt} so the screen
   * can say when rather than saying no.
   */
  'cooldown',
] as const;

export type TableAssistanceRefusalReason =
  (typeof TABLE_ASSISTANCE_REFUSAL_REASONS)[number];

/** What the guest's phone sends to raise one. */
export interface RequestTableAssistanceRequest {
  restaurantId: string;
  /** The table the guest scanned, which names their session document. */
  tableId: string;
  kind: TableAssistanceKind;
}

export interface TableAssistanceRaised {
  ok: true;
  request: TableAssistanceRequest;
  /**
   * Whether the tap joined a signal that was already up.
   *
   * Returned rather than hidden, because the two are different sentences on
   * the guest's screen: one says the restaurant has been told, the other says
   * they have already been told and somebody is coming. Hiding it would make a
   * second tap look like it did nothing, which is what makes people tap a
   * third time.
   */
  alreadyOpen: boolean;
  /** What the table is once the signal landed. `awaitingPayment`, on a bill. */
  tableStatus: TableStatus;
}

export interface TableAssistanceRefused {
  ok: false;
  reason: TableAssistanceRefusalReason;
  /** When the guest may ask again, in epoch milliseconds. On `cooldown` only. */
  retryAt?: number;
}

/** What `requestTableAssistance` answers with. */
export type RequestTableAssistanceResult =
  TableAssistanceRaised | TableAssistanceRefused;

/** Whether a signal went up, as a type guard. */
export const isTableAssistanceRaised = (
  result: RequestTableAssistanceResult,
): result is TableAssistanceRaised => result.ok;

/**
 * What a member of staff sends to clear one.
 *
 * The table and the kind rather than the document id, because those are what
 * the id *is* - and naming the parts means the caller cannot address a
 * document in another restaurant by pasting a name.
 */
export interface AcknowledgeTableAssistanceRequest {
  restaurantId: string;
  tableId: string;
  kind: TableAssistanceKind;
}

/**
 * What `acknowledgeTableAssistance` answers with.
 *
 * There is no `expectedStatus` and no conflict, which is the one place this
 * deliberately differs from `transitionTableOrderStatus`. An order transition
 * has four destinations and two members of staff can want different ones; an
 * acknowledgement has one, so two people pressing it in the same second both
 * wanted what happened. The second press is answered with the stored values
 * rather than with an error about a race that cost nobody anything.
 */
export interface AcknowledgeTableAssistanceResult {
  restaurantId: string;
  tableId: string;
  kind: TableAssistanceKind;
  status: TableAssistanceStatus;
  acknowledgedAt: number;
  acknowledgedByUserId: string;
  /** False when somebody else had already taken it. */
  changed: boolean;
}
