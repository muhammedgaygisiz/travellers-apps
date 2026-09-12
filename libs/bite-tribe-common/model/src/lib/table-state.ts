/**
 * What a table is doing right now, as opposed to what the table is
 * (GitHub issue #1091).
 *
 * ## Why live state is not a field on the table
 *
 * `RestaurantTable` is configuration. An owner writes it while laying out a
 * room, and it changes a few times a year. This is operation. A host writes it
 * every time a party sits down, and it changes a few hundred times a service.
 *
 * Putting the two in one document would mean a seating writes the geometry, so
 * a host tapping "seat" during service could overwrite a rearrangement the
 * owner is making on a tablet in the same room, and a plan published mid
 * service could put every table back to whatever state was read when the
 * editor opened. Two documents make that structural rather than a rule
 * somebody has to keep: a state write names no geometry field and a plan write
 * names no status field, so neither can reach the other however careless the
 * caller is.
 *
 * It is also what lets the permissions differ. [[Table]] gives staff live
 * state and no floor-plan write at all, and security rules scope a
 * collection - they cannot hide one field of one document from one reader.
 *
 * ## Storage
 *
 * One document per table at
 * `/restaurants/{restaurantId}/tableStates/{tableId}`, written independently
 * of `/restaurants/{restaurantId}/tables/{tableId}` and of the room that holds
 * the geometry.
 *
 * A table with no state document is `available`. That is the whole of what
 * "no document" means: a restaurant that has never used the live view, a table
 * placed this morning, and a table explicitly freed by a bulk end-of-service
 * reset all read the same, and nothing has to backfill a document for every
 * table of every restaurant before the staff view can render. Use
 * `tableStatusOf` rather than defaulting at each call site.
 *
 * ## `disabled` here versus `enabled` on the table
 *
 * These are different decisions by different people and must not be
 * conflated.
 *
 * | Concept                       | Meaning                          | Owner              |
 * | ----------------------------- | -------------------------------- | ------------------ |
 * | `RestaurantTable.enabled`     | In service at all, indefinitely  | Owner, in the plan |
 * | `TableStatus` `'disabled'`    | Blocked right now, for a service | Staff, in the view |
 *
 * A table with `enabled: false` is out of service until the owner says
 * otherwise: it gets no QR token, and a code printed before it was disabled
 * resolves to "not in service". A table whose live status is `'disabled'` is
 * a working table with a wobbly leg or a reserved section round it, and a
 * staff member clears it in one tap. Neither implies the other, and nothing in
 * this file reads `enabled` - the two live in separate documents on purpose.
 *
 * The product rules are in `ssot/pages/Table.md`.
 */

/**
 * Every live status a table can hold, in the order the lifecycle visits them.
 *
 * A `const` tuple rather than a bare union, because the exhaustive transition
 * test and any UI that renders a legend both need to enumerate the statuses at
 * runtime, and a union that exists only at compile time cannot be iterated.
 */
export const TABLE_STATUSES = [
  /** Free and ready for the next party. */
  'available',
  /** Held for an expected party that has not arrived. */
  'reserved',
  /** A party is seated. */
  'occupied',
  /** An order is being placed. Reached from issue #1072 events, or manually. */
  'ordering',
  /** The bill has been requested or is being settled. */
  'awaitingPayment',
  /** Being turned over between parties. */
  'cleaning',
  /** Blocked for this service by a staff member. */
  'disabled',
] as const;

/** The live status of one table. */
export type TableStatus = (typeof TABLE_STATUSES)[number];

/**
 * The status of a table that has no state document.
 *
 * Named rather than written as `'available'` at each call site, so the answer
 * to "what is an untouched table" is in one place when a restaurant later asks
 * for it to be something else.
 */
export const DEFAULT_TABLE_STATUS: TableStatus = 'available';

/**
 * What a table is doing right now.
 *
 * Carries no geometry, no capacity and no label. A table is renamed, resized,
 * reshaped and moved to another room without this document being touched, and
 * a party is seated and freed without the plan being touched, which is the
 * separation [[Table]] requires and the reason the two are separate documents.
 */
export interface TableState {
  /**
   * The table this state belongs to, equal to the document id.
   *
   * Repeated as a field, unlike `Room`, which leaves its restaurant to the
   * path. A room is always read by a path the caller built, so the caller
   * already knows it. A table state arrives in a snapshot of many - the staff
   * view listens to a whole restaurant, and the analytics of issue #1098 read
   * across restaurants with a collection-group query, which can filter on
   * fields and not on path segments. A state that does not know its own table
   * is unusable in both.
   */
  tableId: string;
  /** The owning restaurant, for the same reason as `tableId`. */
  restaurantId: string;
  /** What the table is doing. */
  status: TableStatus;
  /**
   * When the table entered `status`, in epoch milliseconds.
   *
   * The point of the field is the duration on screen: a host looks at a room
   * and needs to see that table 6 has been awaiting payment for twenty minutes
   * and table 9 has been cleaning for two. It is therefore the moment of the
   * last accepted *transition*, not the last write - a note added to a
   * reserved table does not restart its clock.
   *
   * A number rather than a Firestore timestamp, following `FloorPlanDraft`:
   * it crosses the Capacitor Firestore bridge as itself on every platform, and
   * a duration is arithmetic rather than formatting. The backend of issue
   * #1092 is what stamps it, so two devices cannot disagree about the clock.
   */
  since: number;
  /**
   * The staff member or owner who made the transition into `status`.
   *
   * Required, because a disputed table is the case the field exists for: a
   * party says they were never seated, and the answer has to name somebody.
   * The full history is the audit trail of issue #1092; this is the last
   * writer, kept on the state so the live view can show it without a second
   * read.
   */
  updatedByUserId: string;
  /**
   * The open visit at this table, while there is one.
   *
   * Absent for `available`, `cleaning` and `disabled`, and for a `reserved`
   * table whose party has not arrived. The visit itself is issue #1095 and
   * owns the party: its guest count, its orders and its bill. This field is
   * the pointer the live view follows, not a copy of any of that.
   */
  visitId?: string;
  /**
   * A short free-text note from staff, such as `Wobbly leg` or `Held for 20:00
   * birthday`.
   *
   * Absent when there is nothing to say. It explains a status to the next
   * person on shift and is never parsed - anything the system needs to act on
   * is a field.
   */
  note?: string;
}

/**
 * Which statuses each status may move to. The single definition.
 *
 * Data rather than a switch or a chain of conditionals, because the same
 * answer is needed in three places that cannot share code paths: the backend
 * validates a requested transition, the staff view offers only the actions
 * that are currently legal, and the test below checks all forty-nine pairs. A
 * matrix spread across conditionals drifts between those three; a table
 * cannot.
 *
 * A status never lists itself. Re-applying the status a table already holds is
 * not a transition, it is a retry - the offline queue of issue #1096 replays
 * one, and that is settled by the idempotency key on the request rather than
 * by widening the matrix. Allowing self-transitions here would make a
 * duplicate seating look legal and reset `since`, which is exactly the clock
 * the staff view is reading.
 *
 * `ordering` and `awaitingPayment` are reachable in stage 2 only by a staff
 * member choosing them, because nothing emits the events yet. They are in the
 * matrix now so the QR ordering of issue #1072 advances a state machine that
 * is already complete and already tested, rather than one that has to grow two
 * states and be re-validated while an ordering flow is being written against
 * it.
 */
export const TABLE_STATE_TRANSITIONS: Readonly<
  Record<TableStatus, readonly TableStatus[]>
> = {
  available: ['reserved', 'occupied', 'cleaning', 'disabled'],
  reserved: ['occupied', 'available', 'disabled'],
  occupied: ['ordering', 'awaitingPayment', 'cleaning', 'available'],
  ordering: ['awaitingPayment', 'occupied', 'cleaning'],
  awaitingPayment: ['cleaning', 'available'],
  cleaning: ['available', 'disabled'],
  disabled: ['available'],
} as const;

/**
 * The statuses a table currently in `from` may move to.
 *
 * What a UI asks: the staff view renders one action per returned status, so a
 * table that cannot be reserved offers no Reserve button rather than a button
 * the backend then refuses.
 */
export const allowedTableStatusTransitions = (
  from: TableStatus,
): readonly TableStatus[] => TABLE_STATE_TRANSITIONS[from];

/**
 * Whether a table in `from` may move to `to`.
 *
 * What the backend asks, once, before writing. It answers `false` for
 * `from === to`, for the reason on `TABLE_STATE_TRANSITIONS`.
 */
export const canTransitionTableStatus = (
  from: TableStatus,
  to: TableStatus,
): boolean => TABLE_STATE_TRANSITIONS[from].includes(to);

/**
 * Whether an unknown value is a status this model knows.
 *
 * The backend of issue #1092 receives a requested status over a callable and
 * therefore from a client, where the type says nothing. Narrowing through this
 * is what keeps a typo or a stale app version out of the database as a status
 * no view has a colour for.
 */
export const isTableStatus = (value: unknown): value is TableStatus =>
  typeof value === 'string' &&
  (TABLE_STATUSES as readonly string[]).includes(value);

/**
 * The live status of a table, given its state document or the absence of one.
 *
 * The absence is the ordinary case rather than an error: no restaurant starts
 * with a state document per table, and nothing writes one until a staff member
 * first acts on that table. Every reader goes through here, so "no document
 * means available" is one decision instead of a default repeated at each call
 * site and forgotten at one of them.
 */
export const tableStatusOf = (state: TableState | undefined): TableStatus =>
  state?.status ?? DEFAULT_TABLE_STATUS;
