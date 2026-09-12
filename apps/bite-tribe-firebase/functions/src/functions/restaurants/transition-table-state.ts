import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { rolesOf } from '../shared/roles';
import {
  RESTAURANT_COLLECTION,
  RESTAURANT_STAFF_COLLECTION,
  holdsTableStateAuthority,
  parseRequiredString,
  requireTableStateAuthority,
} from './restaurant-authority';
import { TABLES_COLLECTION } from './table-qr-tokens';
import {
  TABLE_STATES_COLLECTION,
  TABLE_STATE_TRANSITIONS_COLLECTION,
  TableState,
  TableStateTransition,
  TableStatus,
  canTransitionTableStatus,
  holdsParty,
  parseTableStatus,
  seatsParty,
  tableStatusOf,
  visitIdOf,
} from './table-state';
import {
  TABLE_STATUS_AFTER_VISIT,
  TABLE_VISITS_COLLECTION,
  TABLE_VISIT_END_STATUSES,
  TableVisit,
  TableVisitStatus,
} from './table-visit';

/**
 * The one writer of live table state (GitHub issue #1092).
 *
 * ## Why a callable and not a client write
 *
 * Two hosts tap "seat" on table 12 in the same second. With client writes the
 * later one lands, and the restaurant now has one table, one state, and two
 * parties standing in the doorway believing they have it. Nothing about that is
 * recoverable afterwards, because the losing write left no trace.
 *
 * So the transition is applied here, inside a transaction, against the state
 * the caller says it saw. Exactly one of the two commits; the other is told
 * `aborted` and what the table actually holds now, which is the difference
 * between a race the product loses silently and a message a host can act on.
 * `firestore.rules` refuses every client write to `tableStates`, so this is not
 * merely the path the app takes - it is the only path there is.
 *
 * ## What one transition writes
 *
 * Two documents, in one commit:
 *
 * ```text
 * /restaurants/{restaurantId}/tableStates/{tableId}            replaced
 * /restaurants/{restaurantId}/tableStateTransitions/{id}       appended
 * ```
 *
 * The state is what the room looks like now and the transition is how it got
 * there. They land together because a state nobody can account for is the
 * disputed table this issue exists to answer, and an entry describing a state
 * that was never written is worse than no entry at all.
 *
 * The state document is **replaced rather than merged**, so it says exactly
 * what the last accepted transition said and cannot carry a note left on the
 * table three parties ago. The one field carried forward is `visitId`, and only
 * into a status that still holds a party.
 *
 * ## Seating is opening a visit
 *
 * Since issue #1095 a third document can land in the same commit: the visit at
 * `/restaurants/{restaurantId}/visits/{visitId}`. Seating a table **is**
 * opening a visit and freeing it **is** ending one - not two actions a host has
 * to remember to pair, but one transition that writes both, so a table cannot
 * be occupied by nobody and a party cannot outlive the table state that points
 * at it.
 *
 * That also settles "a table has at most one open visit" without a uniqueness
 * check anywhere. The state's `visitId` is the only pointer at an open visit,
 * and it is written and dropped by the same commit that moves the status - so
 * the two hosts racing to seat table 12 contend on that one document, and the
 * loser re-reads it and fails its `expectedStatus` check before it can create a
 * second visit.
 *
 * ## Why this is not an operator action
 *
 * `logOperatorAction` records privileged one-off actions to Cloud Logging,
 * where they are read by the operator who went looking. This is neither: it
 * happens a few hundred times a service, its audience is the restaurant rather
 * than BiteTribe, and what it needs is a record the business app can show
 * beside the table. That record is `tableStateTransitions`, which is durable,
 * queryable and scoped to the restaurant that owns it. Adding a second, thinner
 * copy to the operator trail would bury every real operator action in seating
 * traffic.
 */

export interface TransitionTableStateRequest {
  restaurantId?: unknown;
  tableId?: unknown;
  /** The status the table should move to. */
  status?: unknown;
  /**
   * The status the caller believes the table holds right now.
   *
   * Required, and it is what makes a conflict explicit rather than inferred.
   * Without it the losing half of two simultaneous seatings is refused for
   * being an `occupied` to `occupied` transition, which is a sentence about the
   * matrix; with it, the refusal is "the table is occupied and you were looking
   * at available", which is the sentence a host needs. Every caller has it:
   * the live view of issue #1093 is a realtime subscription to these very
   * documents, so it is on screen at the moment the button is pressed.
   *
   * A table with no state document is `available`, so that is what a first
   * transition sends.
   */
  expectedStatus?: unknown;
  /**
   * The party size, where the host recorded one. Used only when this
   * transition opens a visit.
   *
   * Optional, because a host tapping a table mid-rush has not been asked for a
   * number, and refusing the seating over it would cost more than the field is
   * worth.
   */
  guestCount?: unknown;
  /**
   * How the visit this transition ends should be recorded: `closed` or
   * `abandoned`. Defaults to `closed`, and is ignored when no visit ends.
   *
   * `abandoned` is the table found still open at the end of service, or the
   * party that walked out. It is kept apart from `closed` because a bill
   * reconciled and a bill nobody ever looked at are different facts, and the
   * payment of issue #1073 charges for one of them.
   */
  visitOutcome?: unknown;
  /** Why, recorded on the audit entry. Optional free text. */
  reason?: unknown;
  /** A short note for the next person on shift, written onto the state. */
  note?: unknown;
}

export interface TransitionTableStateResult {
  restaurantId: string;
  tableId: string;
  from: TableStatus;
  to: TableStatus;
  /** The moment the table entered `to`, and the `at` of the audit entry. */
  since: number;
  /** The appended audit entry, so a caller can cite the transition it made. */
  transitionId: string;
  /**
   * The visit this transition opened, carried forward or ended.
   *
   * Absent when the table had no party before and has none now - a table going
   * `available` to `cleaning` at the end of service names no visit because
   * there was never one to name.
   */
  visitId?: string;
  /** What the visit named by `visitId` is now. */
  visitStatus?: TableVisitStatus;
}

/**
 * What the caller is told when the table moved under it.
 *
 * Structured rather than interpolated into the message, because the live view
 * renders it: "someone else just seated this table" is the sentence, and the
 * status it has now is what the view needs to stop offering the button that
 * failed. `updatedByUserId` names a colleague at the same restaurant, which is
 * already on the state document the same caller subscribes to.
 */
export interface TableStateConflict {
  currentStatus: TableStatus;
  expectedStatus: TableStatus;
  updatedByUserId: string;
  since: number;
}

/** The free-text fields, capped so a note cannot be used as storage. */
const MAX_TEXT_LENGTH = 280;

/**
 * An optional free-text field, trimmed and length-capped.
 *
 * Absent and empty are the same answer - a note cleared in the UI arrives as
 * `''` - so both produce no field rather than an empty string somebody has to
 * remember to treat as absent.
 */
const parseOptionalText = (value: unknown, field: string): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} must be text.`);
  }

  const text = value.trim();

  if (text.length > MAX_TEXT_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `${field} must be ${MAX_TEXT_LENGTH} characters or fewer.`,
    );
  }

  return text;
};

/** The largest party a single visit can plausibly record. */
const MAX_GUEST_COUNT = 200;

/**
 * The party size, or `0` for "not recorded".
 *
 * Whole and at least one, because half a guest is a typo and a party of zero is
 * a host who meant to cancel. Both arrive as `invalid-argument` rather than
 * being rounded or ignored: a seating recorded with a wrong number is worse
 * than one recorded with none, which is what absent means.
 */
const parseGuestCount = (value: unknown): number => {
  if (value === undefined || value === null || value === '') {
    return 0;
  }

  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_GUEST_COUNT
  ) {
    throw new HttpsError(
      'invalid-argument',
      `guestCount must be a whole number between 1 and ${MAX_GUEST_COUNT}.`,
    );
  }

  return value;
};

/**
 * How an ending visit should be recorded.
 *
 * `closed` by default, so every caller written before issue #1095 - the staff
 * actions of issue #1094 among them - keeps freeing tables the ordinary way
 * without sending a field it does not know about.
 */
const parseVisitOutcome = (value: unknown): TableVisitStatus => {
  if (value === undefined || value === null || value === '') {
    return 'closed';
  }

  if (!TABLE_VISIT_END_STATUSES.includes(value as TableVisitStatus)) {
    throw new HttpsError(
      'invalid-argument',
      `visitOutcome must be one of ${TABLE_VISIT_END_STATUSES.join(', ')}.`,
    );
  }

  return value as TableVisitStatus;
};

/**
 * The open visit at this table, taken from the state document.
 *
 * The state's `visitId` is the only pointer there is, and the pointer is what
 * makes "a table has at most one open visit" true rather than merely checked.
 * A visit is created only by a transition into `occupied` from a status holding
 * no party, and that same commit writes the pointer; a transition out of the
 * party statuses ends the visit and drops it. Both are one write of the one
 * state document the two racing hosts contend on, so a second visit at a table
 * would need a state write that did not come from here - and `firestore.rules`
 * refuses every client write to `tableStates`.
 *
 * Deliberately *not* a query over `visits` for the open one. That would be a
 * second answer to a question the state already answers, free to disagree with
 * it, and it would put a whole collection in the read set of every transition -
 * so a party seated at table 5 would invalidate a transaction about table 12.
 *
 * `holdsParty(from)` rather than the raw field: a status that holds no party
 * has no business carrying a pointer, so one found there is ignored rather than
 * acted on.
 */
const carriedVisitId = (
  from: TableStatus,
  current: DocumentData | undefined,
): string => (holdsParty(from) ? visitIdOf(current) : '');

/**
 * Whether this transition is a table acquiring a party it did not have.
 *
 * `occupied` and not `reserved`: a held table has nobody sitting at it, and a
 * visit opened when the booking was taken would have its `openedAt` an hour
 * before the party walked in. The party arriving is `reserved -> occupied`,
 * which is where the visit starts.
 */
const opensVisit = (to: TableStatus, carried: string): boolean =>
  to === 'occupied' && !carried;

/**
 * Whether this transition ends the party that was at the table.
 *
 * Leaving the statuses that hold a party, while there is a visit to end. A
 * table whose party was already ended ends nothing - the alternative is a
 * second `closedAt`, an hour later, describing an instant at which nothing
 * happened.
 */
const endsVisit = (to: TableStatus, carried: string): boolean =>
  Boolean(carried) && !holdsParty(to);

/**
 * `visitId` is deliberately not accepted from the request. A caller has no
 * visit to name that this callable did not give it, and a client-supplied
 * pointer to a document nothing validates is worse than an absent field.
 */
const nextVisitId = (to: TableStatus, visitId: string): string =>
  holdsParty(to) ? visitId : '';

/**
 * What the visit named in the result is, once this transition has landed.
 *
 * Open when the transition opened or carried it, the requested outcome when it
 * ended it, and absent when there is no visit to describe - which is most
 * transitions, because most of a table's day happens with nobody at it.
 */
const visitStatusAfter = (
  visitId: string,
  ending: boolean,
  outcome: TableVisitStatus,
): TableVisitStatus | undefined => {
  if (!visitId) {
    return undefined;
  }

  return ending ? outcome : 'open';
};

/**
 * Refuses freeing a table that still has a party recorded at it, other than by
 * turning it over.
 *
 * The acceptance criterion of issue #1095: "closing a visit sets the table to a
 * state that requires an explicit next action, so tables are not silently
 * reused". The matrix of issue #1091 allows `occupied -> available` and
 * `awaitingPayment -> available`, and it is right to - that is what a table
 * wrongly seated and immediately corrected does. What it must not be is how a
 * real party ends, because a table that goes straight to `available` is offered
 * to the next party with the last one's plates still on it.
 *
 * So the matrix stays as it is and this narrows it for the one case it cannot
 * see: a table with an open visit. A table without one is unaffected.
 */
const assertEndsByTurningOver = (to: TableStatus): void => {
  if (to !== TABLE_STATUS_AFTER_VISIT) {
    throw new HttpsError(
      'failed-precondition',
      `A table with an open visit becomes ${TABLE_STATUS_AFTER_VISIT} when the party leaves, not ${to}.`,
    );
  }
};

/**
 * Refuses a transition the matrix does not allow.
 *
 * Including `from === to`: re-applying the status a table already holds is a
 * retry rather than a transition, and admitting it would reset `since` and lose
 * the duration the staff view is built to show. The replay that arrives from an
 * offline queue is answered by the idempotency key of issue #1096.
 */
const assertAllowed = (from: TableStatus, to: TableStatus): void => {
  if (!canTransitionTableStatus(from, to)) {
    throw new HttpsError(
      'failed-precondition',
      from === to
        ? `The table is already ${from}.`
        : `A table cannot go from ${from} to ${to}.`,
    );
  }
};

/**
 * Refuses seating a party at a table the owner has taken out of service.
 *
 * `RestaurantTable.enabled` is the owner's indefinite decision in the floor
 * plan, and the live `disabled` status is a staff member's decision for this
 * service; neither implies the other. What they share is that a table out of
 * service must not acquire a party, which is the epic's "disabling a table in
 * the editor blocks seating".
 *
 * Only the two statuses that *begin* a party are refused. A table disabled
 * while a party is already sitting at it can still be moved to
 * `awaitingPayment`, `cleaning` and `available`, because the alternative is a
 * seated party the staff view cannot clear.
 */
const assertInService = (
  table: DocumentData,
  tableId: string,
  to: TableStatus,
): void => {
  if (seatsParty(to) && table['enabled'] !== true) {
    const label = typeof table['label'] === 'string' ? table['label'] : tableId;

    throw new HttpsError(
      'failed-precondition',
      `Table ${label} is not in service, so no party can be seated at it.`,
    );
  }
};

/**
 * Applies one transition, or explains why it did not happen.
 *
 * Everything that decides the outcome is read inside the transaction: the
 * restaurant and the staff association, because an assignment can be revoked
 * and a staff member taken off a restaurant between the authorisation and the
 * commit; the table, because it can be deleted or taken out of service; and the
 * state, because that is the read half of the read-check-write this whole
 * callable is.
 *
 * Firestore retries a transaction whose reads were touched before it committed,
 * so the loser of two simultaneous seatings re-reads the state the winner
 * wrote and fails the `expectedStatus` check on the second pass. That is where
 * the conflict comes from - not from a timestamp comparison, and not from a
 * lock the caller has to hold.
 */
export const transitionTableStateHandler = async (
  request: CallableRequest<TransitionTableStateRequest>,
): Promise<TransitionTableStateResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const tableId = parseRequiredString(request.data?.tableId, 'tableId');
  const to = parseTableStatus(request.data?.status, 'status');
  const expected = parseTableStatus(
    request.data?.expectedStatus,
    'expectedStatus',
  );
  const guestCount = parseGuestCount(request.data?.guestCount);
  const visitOutcome = parseVisitOutcome(request.data?.visitOutcome);
  const reason = parseOptionalText(request.data?.reason, 'reason');
  const note = parseOptionalText(request.data?.note, 'note');

  const actingUid = await requireTableStateAuthority(request, restaurantId);

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const staffRef = firestore
    .collection(RESTAURANT_STAFF_COLLECTION)
    .doc(actingUid);
  const tableRef = restaurantRef.collection(TABLES_COLLECTION).doc(tableId);
  const stateRef = restaurantRef
    .collection(TABLE_STATES_COLLECTION)
    .doc(tableId);
  const transitionRef = restaurantRef
    .collection(TABLE_STATE_TRANSITIONS_COLLECTION)
    .doc();
  const visits = restaurantRef.collection(TABLE_VISITS_COLLECTION);

  return firestore.runTransaction(async (transaction) => {
    const [restaurant, staffAssociation, table, state] = await Promise.all([
      transaction.get(restaurantRef),
      transaction.get(staffRef),
      transaction.get(tableRef),
      transaction.get(stateRef),
    ]);

    if (!restaurant.exists) {
      throw new HttpsError('not-found', 'Restaurant was not found.');
    }

    if (
      !holdsTableStateAuthority(
        request,
        restaurant.data() ?? {},
        staffAssociation.data(),
        restaurantId,
        actingUid,
      )
    ) {
      throw new HttpsError(
        'permission-denied',
        'You do not work at this restaurant.',
      );
    }

    // An unpublished table has no document under `tables` at all - the editor
    // of issue #1088 keeps its work in `rooms/{roomId}/drafts/current` until
    // the owner publishes - so "does not exist" and "is not published" are one
    // check rather than two. A table of another restaurant is a miss for the
    // same reason: this path is built from the restaurant the caller was
    // authorised against, so there is nowhere for it to be found.
    if (!table.exists) {
      throw new HttpsError(
        'not-found',
        'That table is not part of the published floor plan of this restaurant.',
      );
    }

    const tableData = table.data() ?? {};
    const current = state.data();
    const from = tableStatusOf(current);

    if (from !== expected) {
      const conflict: TableStateConflict = {
        currentStatus: from,
        expectedStatus: expected,
        updatedByUserId:
          typeof current?.['updatedByUserId'] === 'string'
            ? current['updatedByUserId']
            : '',
        since: typeof current?.['since'] === 'number' ? current['since'] : 0,
      };

      throw new HttpsError(
        'aborted',
        `The table is ${from} now, not ${expected}. Someone else changed it first.`,
        conflict,
      );
    }

    assertAllowed(from, to);
    assertInService(tableData, tableId, to);

    const carried = carriedVisitId(from, current);
    const opening = opensVisit(to, carried);
    const ending = endsVisit(to, carried);

    if (ending) {
      assertEndsByTurningOver(to);
    }

    const at = Date.now();
    const openedVisitRef = opening ? visits.doc() : undefined;
    const visitId = openedVisitRef?.id ?? carried;
    const visitStatus = visitStatusAfter(visitId, ending, visitOutcome);

    const nextState: TableState = {
      tableId,
      restaurantId,
      status: to,
      since: at,
      updatedByUserId: actingUid,
      ...(nextVisitId(to, visitId) ? { visitId } : {}),
      ...(note ? { note } : {}),
    };

    const entry: TableStateTransition = {
      tableId,
      restaurantId,
      from,
      to,
      actorUserId: actingUid,
      actorRoles: rolesOf(request),
      at,
      atIso: new Date(at).toISOString(),
      ...(visitId ? { visitId } : {}),
      ...(reason ? { reason } : {}),
    };

    if (openedVisitRef) {
      const opened: TableVisit = {
        id: openedVisitRef.id,
        restaurantId,
        tableId,
        status: 'open',
        openedAt: at,
        ...(guestCount ? { guestCount } : {}),
        openedByUserId: actingUid,
      };

      transaction.create(openedVisitRef, opened);
    }

    if (ending) {
      // An update rather than a replacement: the visit keeps the `openedAt`,
      // the party size and the opener it was created with, and gains only how
      // and when it ended.
      transaction.update(visits.doc(carried), {
        status: visitOutcome,
        closedAt: at,
        closedByUserId: actingUid,
      });
    }

    transaction.set(stateRef, nextState);
    transaction.create(transitionRef, entry);

    return {
      restaurantId,
      tableId,
      from,
      to,
      since: at,
      transitionId: transitionRef.id,
      ...(visitId ? { visitId } : {}),
      ...(visitStatus ? { visitStatus } : {}),
    };
  });
};

/**
 * The first callable a `staff` account may reach.
 *
 * Classified `staffAuthority` in `callable-authorization.spec.ts`: it admits
 * `staff`, `business` and `admin` and then decides for itself which restaurant
 * each of them reaches. That is a wider door than `restaurantAuthority`, and
 * it opens onto a narrower room - live state and nothing else. A host can seat
 * a table and cannot touch the floor plan, the QR codes or the staff list.
 */
export const transitionTableState = onAppCheck<TransitionTableStateRequest>(
  transitionTableStateHandler,
);
