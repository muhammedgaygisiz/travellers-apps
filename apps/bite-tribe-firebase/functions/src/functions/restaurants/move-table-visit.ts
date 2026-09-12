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
  tableStatusOf,
  visitIdOf,
} from './table-state';
import {
  TABLE_STATUS_AFTER_VISIT,
  TABLE_VISITS_COLLECTION,
  isOpenVisit,
} from './table-visit';
import { TableStateConflict } from './transition-table-state';

/**
 * Moving a party to another table without ending its visit
 * (GitHub issue #1095).
 *
 * ## Why this is not two transitions
 *
 * A host could free table 12 and seat table 5, and for the *table* that is
 * exactly what happens. For the *party* it is not: freeing a table ends its
 * visit, and the party that sits down at table 5 is then a new visit with a new
 * id, an `openedAt` twenty minutes after it walked in, and none of the orders
 * it placed at the old table - because orders hang from the visit
 * (issue #1072). A bill would arrive missing its starters.
 *
 * So the move is one operation, and the thing it preserves is the visit's
 * identity. `tableId` changes and nothing else does: the id, the opener, the
 * moment the party was seated and its size are what they were, and every order
 * already pointing at this visit still points at it.
 *
 * ## What one move writes
 *
 * Up to five documents, in one commit:
 *
 * ```text
 * /restaurants/{id}/visits/{visitId}                 tableId updated
 * /restaurants/{id}/tableStates/{toTableId}          replaced, occupied
 * /restaurants/{id}/tableStates/{fromTableId}        replaced, turned over
 * /restaurants/{id}/tableStateTransitions/{a}        appended, the table left
 * /restaurants/{id}/tableStateTransitions/{b}        appended, the table taken
 * ```
 *
 * The two audit entries carry the `visitId`, which is what makes the trail the
 * visit's own history: "which tables did this party sit at tonight" is one
 * `where` on `visitId`, and no list of tables has to be copied onto the visit
 * where it could disagree with the trail.
 *
 * The destination must have no party of its own, and that is read off its state
 * document rather than looked up in `visits`. The matrix alone does not say so:
 * `ordering -> occupied` is legal, being a party sending the waiter away, so
 * without the check a second party walked onto a table mid-order would
 * overwrite its pointer and leave the first party's visit unreachable.
 *
 * The table left behind lands on `TABLE_STATUS_AFTER_VISIT` for the same reason
 * a closing visit does - the party took its glasses with it and left everything
 * else - so somebody has to look at the table before the next party gets it.
 *
 * ## The table that is no longer there
 *
 * The source table's state is only rewritten while it still points at this
 * visit. A table deleted from the floor plan, or one already freed by a state
 * write that crossed this one, leaves the visit perfectly movable: the party is
 * standing in the room whatever the plan says about where it used to sit. That
 * is the same reason visits live under the restaurant rather than under the
 * table.
 */

export interface MoveTableVisitRequest {
  restaurantId?: unknown;
  /** The visit to move. It must still be open. */
  visitId?: unknown;
  /** The table the party is moving to. */
  toTableId?: unknown;
  /**
   * The status the caller believes the destination table holds.
   *
   * The same conflict guard `transitionTableState` uses, and needed here for
   * the same reason: the table the host is walking the party towards is one
   * another host can seat in the meantime. The destination is the contended
   * one - the table being left is held by this very visit.
   */
  expectedStatus?: unknown;
  /** Why, recorded on both audit entries. Optional free text. */
  reason?: unknown;
}

export interface MoveTableVisitResult {
  restaurantId: string;
  visitId: string;
  fromTableId: string;
  toTableId: string;
  /** The status the table the party left now holds. */
  fromStatus: TableStatus;
  /** The moment of the move, and the `at` of both audit entries. */
  since: number;
  /**
   * The appended audit entries: the table left, then the table taken.
   *
   * One entry when the source table no longer had a state pointing at this
   * visit, because nothing happened to it to record.
   */
  transitionIds: string[];
}

/** The free-text reason, capped so it cannot be used as storage. */
const MAX_REASON_LENGTH = 280;

const parseReason = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }

  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', 'reason must be text.');
  }

  const reason = value.trim();

  if (reason.length > MAX_REASON_LENGTH) {
    throw new HttpsError(
      'invalid-argument',
      `reason must be ${MAX_REASON_LENGTH} characters or fewer.`,
    );
  }

  return reason;
};

/**
 * The table a stored visit is sitting at.
 *
 * Read off the document rather than trusted, because this is what every path
 * below is built from: the state to turn over, the check that the party is not
 * already where it is being sent, and the audit entry for the table left.
 */
const tableIdOf = (visit: DocumentData): string =>
  typeof visit['tableId'] === 'string' ? visit['tableId'] : '';

/**
 * Whether the table the party is leaving still believes it has this party.
 *
 * Both halves matter. A state pointing at another visit belongs to a party
 * seated there after this one left, and turning it over would free a table with
 * people at it; a state whose status holds no party has already been turned
 * over by somebody, and writing `cleaning` over its `available` would put a
 * clean table back in the queue. A table deleted from the plan has no state at
 * all, and the party standing in the room is movable regardless - which is the
 * same reason visits live under the restaurant rather than under the table.
 */
const stillSeats = (
  state: DocumentData | undefined,
  visitId: string,
): boolean => visitIdOf(state) === visitId && holdsParty(tableStatusOf(state));

/** One append-only entry, as both halves of a move write it. */
const entryFor = (
  request: CallableRequest<unknown>,
  fields: {
    restaurantId: string;
    tableId: string;
    from: TableStatus;
    to: TableStatus;
    actorUserId: string;
    visitId: string;
    at: number;
    reason: string;
  },
): TableStateTransition => ({
  tableId: fields.tableId,
  restaurantId: fields.restaurantId,
  from: fields.from,
  to: fields.to,
  actorUserId: fields.actorUserId,
  actorRoles: rolesOf(request),
  at: fields.at,
  atIso: new Date(fields.at).toISOString(),
  visitId: fields.visitId,
  ...(fields.reason ? { reason: fields.reason } : {}),
});

/**
 * Moves an open visit to another table, or explains why it did not move.
 *
 * Everything that decides the outcome is read inside the transaction, for the
 * reasons `transitionTableState` sets out: an assignment can be revoked, a
 * table can be deleted or taken out of service, and the destination's state is
 * the read half of a read-check-write. The destination's state document is the
 * contended one, so two hosts sending two parties to table 5 at the same moment
 * produce one move and one `aborted` naming what table 5 holds now.
 */
export const moveTableVisitHandler = async (
  request: CallableRequest<MoveTableVisitRequest>,
): Promise<MoveTableVisitResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const visitId = parseRequiredString(request.data?.visitId, 'visitId');
  const toTableId = parseRequiredString(request.data?.toTableId, 'toTableId');
  const expected = parseTableStatus(
    request.data?.expectedStatus,
    'expectedStatus',
  );
  const reason = parseReason(request.data?.reason);

  const actingUid = await requireTableStateAuthority(request, restaurantId);

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const staffRef = firestore
    .collection(RESTAURANT_STAFF_COLLECTION)
    .doc(actingUid);
  const visits = restaurantRef.collection(TABLE_VISITS_COLLECTION);
  const visitRef = visits.doc(visitId);
  const toTableRef = restaurantRef.collection(TABLES_COLLECTION).doc(toTableId);
  const states = restaurantRef.collection(TABLE_STATES_COLLECTION);
  const toStateRef = states.doc(toTableId);

  return firestore.runTransaction(async (transaction) => {
    // The contended document is the destination's state, and it is read here,
    // in the first round, with everything the decision needs except the state
    // of the table being left - which cannot be read until the visit says which
    // table that is. No query anywhere: the `visitId` on a state document is
    // the one pointer at an open visit, so asking `visits` who is open where
    // would be a second answer to a question the states already answer, and it
    // would put a whole collection in the read set of an operation about two
    // tables.
    const [restaurant, staffAssociation, visit, toTable, toState] =
      await Promise.all([
        transaction.get(restaurantRef),
        transaction.get(staffRef),
        transaction.get(visitRef),
        transaction.get(toTableRef),
        transaction.get(toStateRef),
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

    if (!visit.exists) {
      throw new HttpsError('not-found', 'That visit was not found.');
    }

    const visitData = visit.data() ?? {};

    // A closed visit is not reopened by moving it. The party that comes back
    // for a coffee is a new party, and seating it is `transitionTableState`.
    if (!isOpenVisit(visitData)) {
      throw new HttpsError(
        'failed-precondition',
        'That visit has already ended, so it cannot be moved.',
      );
    }

    const fromTableId = tableIdOf(visitData);

    if (fromTableId === toTableId) {
      throw new HttpsError(
        'failed-precondition',
        'The party is already at that table.',
      );
    }

    // A table that is not in the published plan cannot be walked to. The
    // unpublished draft of issue #1088 has no document here at all, so "does
    // not exist" and "is not published" are one check.
    if (!toTable.exists) {
      throw new HttpsError(
        'not-found',
        'That table is not part of the published floor plan of this restaurant.',
      );
    }

    const toTableData = toTable.data() ?? {};

    if (toTableData['enabled'] !== true) {
      const label =
        typeof toTableData['label'] === 'string'
          ? toTableData['label']
          : toTableId;

      throw new HttpsError(
        'failed-precondition',
        `Table ${label} is not in service, so no party can be seated at it.`,
      );
    }

    const toStateData = toState.data();
    const toStatus = tableStatusOf(toStateData);

    if (toStatus !== expected) {
      const conflict: TableStateConflict = {
        currentStatus: toStatus,
        expectedStatus: expected,
        updatedByUserId:
          typeof toStateData?.['updatedByUserId'] === 'string'
            ? (toStateData['updatedByUserId'] as string)
            : '',
        since:
          typeof toStateData?.['since'] === 'number'
            ? (toStateData['since'] as number)
            : 0,
      };

      throw new HttpsError(
        'aborted',
        `The destination table is ${toStatus} now, not ${expected}. Someone else changed it first.`,
        conflict,
      );
    }

    // The destination takes the party, so it has to be a table that may become
    // `occupied` at all - `available` or `reserved`. The matrix of issue #1091
    // is the one answer to that, here as everywhere else.
    if (!canTransitionTableStatus(toStatus, 'occupied')) {
      throw new HttpsError(
        'failed-precondition',
        `A table cannot go from ${toStatus} to occupied.`,
      );
    }

    // The destination must not already have a party of its own. The matrix
    // alone does not say so: `ordering -> occupied` is a legal transition - it
    // is a party sending the waiter away - so without this, walking a second
    // party onto a table mid-order would overwrite the pointer and strand the
    // party already sitting there with a visit nothing can reach.
    if (visitIdOf(toStateData)) {
      throw new HttpsError(
        'failed-precondition',
        'That table already has a party. End its visit before moving another one there.',
      );
    }

    const fromState = (await transaction.get(states.doc(fromTableId))).data();
    const turnsOverSource = stillSeats(fromState, visitId);
    const fromStatus = tableStatusOf(fromState);

    const at = Date.now();
    const transitionIds: string[] = [];

    if (turnsOverSource) {
      const leftEntryRef = restaurantRef
        .collection(TABLE_STATE_TRANSITIONS_COLLECTION)
        .doc();
      const leftState: TableState = {
        tableId: fromTableId,
        restaurantId,
        status: TABLE_STATUS_AFTER_VISIT,
        since: at,
        updatedByUserId: actingUid,
      };

      transaction.set(states.doc(fromTableId), leftState);
      transaction.create(
        leftEntryRef,
        entryFor(request, {
          restaurantId,
          tableId: fromTableId,
          from: fromStatus,
          to: TABLE_STATUS_AFTER_VISIT,
          actorUserId: actingUid,
          visitId,
          at,
          reason,
        }),
      );
      transitionIds.push(leftEntryRef.id);
    }

    const takenEntryRef = restaurantRef
      .collection(TABLE_STATE_TRANSITIONS_COLLECTION)
      .doc();
    const takenState: TableState = {
      tableId: toTableId,
      restaurantId,
      status: 'occupied',
      since: at,
      updatedByUserId: actingUid,
      visitId,
    };

    transaction.set(toStateRef, takenState);
    transaction.create(
      takenEntryRef,
      entryFor(request, {
        restaurantId,
        tableId: toTableId,
        from: toStatus,
        to: 'occupied',
        actorUserId: actingUid,
        visitId,
        at,
        reason,
      }),
    );
    transitionIds.push(takenEntryRef.id);

    // The one field of the visit that changes. Not a replacement: the id, the
    // opener, `openedAt` and the party size are what make this the same visit
    // rather than a new one at a different table.
    transaction.update(visitRef, { tableId: toTableId });

    return {
      restaurantId,
      visitId,
      fromTableId,
      toTableId,
      fromStatus: turnsOverSource ? TABLE_STATUS_AFTER_VISIT : fromStatus,
      since: at,
      transitionIds,
    };
  });
};

/**
 * Classified `staffAuthority` in `callable-authorization.spec.ts`, alongside
 * `transitionTableState`: walking a party to a bigger table is the same job as
 * seating them at the first one, done by the same host, and requiring the
 * owner's own login for it would mean that login being passed round the floor.
 */
export const moveTableVisit = onAppCheck<MoveTableVisitRequest>(
  moveTableVisitHandler,
);
