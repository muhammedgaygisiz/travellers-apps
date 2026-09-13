import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { rolesOf } from '../shared/roles';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
} from './restaurant-authority';
import {
  ATTENDED_TABLE_STATUSES,
  INITIAL_TABLE_ASSISTANCE_STATUS,
  MAX_TABLE_ASSISTANCE_REQUESTERS,
  TABLE_ASSISTANCE_COOLDOWN_MS,
  TABLE_ASSISTANCE_REQUESTS_COLLECTION,
  TABLE_STATUS_AFTER_BILL_REQUEST,
  TableAssistanceKind,
  TableAssistanceRefused,
  TableAssistanceRequest,
  isOpenAssistanceRequest,
  isTableAssistanceKind,
  refuseAssistance,
  tableAssistanceRequestId,
} from './table-assistance';
import {
  TABLE_SESSIONS_COLLECTION,
  isEndedSession,
  isExpiredSession,
  tableOrderingOf,
  tableSessionId,
  tableSessionIdleTimeoutMs,
} from './table-session';
import {
  TABLE_STATES_COLLECTION,
  TABLE_STATE_TRANSITIONS_COLLECTION,
  TableState,
  TableStateTransition,
  TableStatus,
  canTransitionTableStatus,
  tableStatusOf,
  visitIdOf,
} from './table-state';
import { TABLE_VISITS_COLLECTION, isOpenVisit } from './table-visit';

/**
 * The guest asking for a waiter, or for the bill (GitHub issue #1106).
 *
 * ## What it writes
 *
 * ```text
 * /restaurants/{id}/assistanceRequests/{n}_{tableId}_{kind}  created or joined
 * /restaurants/{id}/tableSessions/{sessionId}                lastActiveAt touched
 * /restaurants/{id}/tableStates/{tableId}                    replaced, on a bill
 * /restaurants/{id}/tableStateTransitions/{transitionId}     appended, on a bill
 * ```
 *
 * ## The rate limit is the document name, plus one clock
 *
 * "Repeated taps do not create repeated signals" is satisfied by the address:
 * the name is derived from the table and the kind, so the second tap lands on
 * the first tap's document and the answer says so rather than writing a second
 * marker. That holds across phones, which is right - two guests at one table
 * asking for the bill are one bill.
 *
 * What the name cannot stop is the cycle: raise, wait to be acknowledged,
 * raise again. So a signal raised inside {@link TABLE_ASSISTANCE_COOLDOWN_MS}
 * of the last one at that table, of that kind, is refused with the moment it
 * may be asked for again. Measured from the *request* rather than from the
 * acknowledgement, so a restaurant is not punished for answering quickly - see
 * the library model for the argument.
 *
 * Joining an open signal is deliberately **not** rate limited. The signal is
 * already up; telling a guest to wait a minute before being told that somebody
 * is already coming would be a refusal in place of the reassurance they tapped
 * for.
 *
 * ## What it does not check
 *
 * `orderingAvailability`. A kitchen that has closed, paused, or never took
 * orders at the table at all has nothing to do with whether a guest sitting in
 * the dining room may ask for the bill - and the moment they most need to is
 * after the kitchen shuts. The scan and the order check it because they are
 * about food; this is about a person.
 *
 * What it does check is everything about the *party*: an active session, an
 * open visit, and a table the floor agrees somebody is sitting at. A signal
 * that failed those would draw a marker on a table a member of staff would
 * walk to and find empty.
 *
 * ## Why the table transition is here rather than in `transitionTableState`
 *
 * The reason `submitTableOrder` gives for the same thing. That callable is
 * guarded by `requireTableStateAuthority`, which a guest - usually an anonymous
 * account - holds nothing for, and widening the guard would hand the floor's
 * state machine to whoever photographed a QR code. So the
 * `occupied -> awaitingPayment` change is written here, from the same types and
 * checked against the same {@link canTransitionTableStatus} matrix, in the
 * commit that writes the signal.
 */

export interface RequestTableAssistanceRequest {
  restaurantId?: unknown;
  /** The table the guest scanned, which names their session document. */
  tableId?: unknown;
  kind?: unknown;
}

export interface TableAssistanceRaised {
  ok: true;
  request: TableAssistanceRequest;
  /** Whether the tap joined a signal that was already up. */
  alreadyOpen: boolean;
  /** What the table is once the signal landed. */
  tableStatus: TableStatus;
}

export type RequestTableAssistanceResult =
  TableAssistanceRaised | TableAssistanceRefused;

/**
 * The caller's uid, and nothing else about them.
 *
 * There is no `guestUserId` argument and there must not be one, for the reason
 * `submitTableOrder` gives: the session's document name is derived from the
 * uid, so a caller can only ever address its own. An anonymous account is
 * enough, and is what most guests have.
 */
const guestUidOf = (request: CallableRequest<unknown>): string => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to ask for a waiter.');
  }

  return request.auth.uid;
};

const parseKind = (value: unknown): TableAssistanceKind => {
  if (!isTableAssistanceKind(value)) {
    throw new HttpsError('invalid-argument', 'kind is not a request kind.');
  }

  return value;
};

/**
 * The requester list with this guest on it, capped.
 *
 * Appended rather than replaced, because the list is what the rules admit as
 * readers and a second guest joining a signal must not take the first guest's
 * screen off it. The cap is a bound on a field a client can grow; past it the
 * guest still raises the signal and simply watches it through the screen they
 * raised it from. Written here rather than with `FieldValue.arrayUnion` so the
 * cap, the order and the de-duplication are one readable rule instead of a
 * server-side merge plus a separate length check.
 */
const withRequester = (existing: unknown, guestUserId: string): string[] => {
  const ids = Array.isArray(existing)
    ? existing.filter((id): id is string => typeof id === 'string')
    : [];

  if (
    ids.includes(guestUserId) ||
    ids.length >= MAX_TABLE_ASSISTANCE_REQUESTERS
  ) {
    return ids;
  }

  return [...ids, guestUserId];
};

export const requestTableAssistanceHandler = async (
  request: CallableRequest<RequestTableAssistanceRequest>,
  now: Date = new Date(),
): Promise<RequestTableAssistanceResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const scannedTableId = parseRequiredString(request.data?.tableId, 'tableId');
  const kind = parseKind(request.data?.kind);
  const guestUserId = guestUidOf(request);

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const sessionRef = restaurantRef
    .collection(TABLE_SESSIONS_COLLECTION)
    .doc(tableSessionId(scannedTableId, guestUserId));
  const at = now.getTime();

  return firestore.runTransaction(async (transaction) => {
    const [restaurantSnapshot, sessionSnapshot] = await Promise.all([
      transaction.get(restaurantRef),
      transaction.get(sessionRef),
    ]);

    if (!sessionSnapshot.exists) {
      return refuseAssistance('sessionNotFound');
    }

    const restaurant = restaurantSnapshot.data() ?? {};
    const session = sessionSnapshot.data();
    const idleTimeoutMs = tableSessionIdleTimeoutMs(
      tableOrderingOf(restaurant)['sessionIdleTimeoutMinutes'],
    );

    if (isEndedSession(session)) {
      return refuseAssistance('sessionNotActive');
    }

    // Persisted rather than merely reported, following the rest of the session
    // design: expiry is observed at the moment somebody asks.
    if (isExpiredSession(session, idleTimeoutMs, at)) {
      transaction.update(sessionRef, { status: 'expired', endedAt: at });

      return refuseAssistance('sessionExpired');
    }

    if (session?.['status'] !== 'active') {
      // A `pending` session is a guest who scanned and has not been seated.
      // They have a signal of their own - the pending session itself - and
      // making it visible to staff is issue #1107 rather than this one, so
      // raising a second kind of signal from a table nobody has been given
      // would be two rows on the floor for one guest waiting at the door.
      return refuseAssistance('sessionNotActive');
    }

    const visitId =
      typeof session?.['visitId'] === 'string' ? session['visitId'] : '';

    if (!visitId) {
      return refuseAssistance('visitClosed');
    }

    const visitRef = restaurantRef
      .collection(TABLE_VISITS_COLLECTION)
      .doc(visitId);
    const visitSnapshot = await transaction.get(visitRef);

    if (!isOpenVisit(visitSnapshot.data())) {
      return refuseAssistance('visitClosed');
    }

    // The visit's table and not the session's, for the reason
    // `submitTableOrder` reads the same field: a party walked to a bigger table
    // keeps its visit and its session, and the session goes on naming the table
    // the guest scanned. A signal means "come to this table", so it has to name
    // the one the party is sitting at now.
    const tableId =
      typeof visitSnapshot.data()?.['tableId'] === 'string'
        ? (visitSnapshot.data()?.['tableId'] as string)
        : scannedTableId;

    const stateRef = restaurantRef
      .collection(TABLE_STATES_COLLECTION)
      .doc(tableId);
    const assistanceRef = restaurantRef
      .collection(TABLE_ASSISTANCE_REQUESTS_COLLECTION)
      .doc(tableAssistanceRequestId(tableId, kind));

    const [stateSnapshot, assistanceSnapshot] = await Promise.all([
      transaction.get(stateRef),
      transaction.get(assistanceRef),
    ]);

    const from = tableStatusOf(stateSnapshot.data());

    if (!ATTENDED_TABLE_STATUSES.includes(from)) {
      return refuseAssistance('tableNotAttended');
    }

    // The state's own pointer, checked against the one the session followed. A
    // table whose visit has been replaced under an active session is a floor
    // and a visit that disagree, and a marker drawn from either would name the
    // wrong party.
    if (visitIdOf(stateSnapshot.data()) !== visitId) {
      return refuseAssistance('visitClosed');
    }

    const stored = assistanceSnapshot.data();
    const alreadyOpen = isOpenAssistanceRequest(stored);
    const requestedAt =
      alreadyOpen && typeof stored?.['requestedAt'] === 'number'
        ? (stored['requestedAt'] as number)
        : at;

    if (!alreadyOpen && stored) {
      // The signal before this one was dealt with. The clock runs from when it
      // was *raised*, so a restaurant that answered in ten seconds does not
      // lock the table out for the remaining fifty.
      const previous =
        typeof stored['requestedAt'] === 'number'
          ? (stored['requestedAt'] as number)
          : 0;
      const retryAt = previous + TABLE_ASSISTANCE_COOLDOWN_MS;

      if (at < retryAt) {
        return refuseAssistance('cooldown', retryAt);
      }
    }

    const raised: TableAssistanceRequest = {
      id: assistanceRef.id,
      restaurantId,
      tableId,
      visitId,
      kind,
      status: INITIAL_TABLE_ASSISTANCE_STATUS,
      // The age staff read. A repeated tap moves `lastRequestedAt` and leaves
      // this alone, so tapping cannot push a table back up a queue sorted by
      // who has been waiting longest.
      requestedAt,
      lastRequestedAt: at,
      requestedByUserIds: withRequester(
        stored?.['requestedByUserIds'],
        guestUserId,
      ),
    };

    // A `set` on both paths rather than an update on the join, because the
    // acknowledged document being replaced still carries `acknowledgedAt` and
    // `acknowledgedByUserId` - and an open signal that names who cleared the
    // last one is a row staff would read as already taken.
    transaction.set(assistanceRef, raised);

    // Asking for a waiter is activity. Without this a party that has stopped
    // ordering and is waiting to pay would go idle on the clock that measures
    // whether anybody is still there.
    transaction.update(sessionRef, { lastActiveAt: at });

    const to = kind === 'requestBill' ? TABLE_STATUS_AFTER_BILL_REQUEST : from;

    if (to !== from) {
      // Checked against the same matrix the staff callable uses rather than
      // asserted, so a matrix edit that stops allowing this reaches here too.
      if (!canTransitionTableStatus(from, to)) {
        return refuseAssistance('tableNotAttended');
      }

      const nextState: TableState = {
        tableId,
        restaurantId,
        status: to,
        since: at,
        updatedByUserId: guestUserId,
        visitId,
      };

      // No `reason`. The field is free text a staff screen renders raw, so an
      // English sentence written here would appear untranslated on a German
      // restaurant's floor; what links this entry to the request is the
      // `visitId` it carries and the signal sitting against the same table.
      const entry: TableStateTransition = {
        tableId,
        restaurantId,
        from,
        to,
        actorUserId: guestUserId,
        actorRoles: rolesOf(request),
        at,
        atIso: new Date(at).toISOString(),
        visitId,
      };

      transaction.set(stateRef, nextState);
      transaction.create(
        restaurantRef.collection(TABLE_STATE_TRANSITIONS_COLLECTION).doc(),
        entry,
      );
    }

    return { ok: true, request: raised, alreadyOpen, tableStatus: to };
  });
};

/**
 * Classified `authenticated` in `callable-authorization.spec.ts`, and the
 * fourth callable for which an *anonymous* session is enough.
 *
 * The same door `startTableSession`, `leaveTableSession` and `submitTableOrder`
 * open. The caller cannot choose the restaurant, the table or the visit: the
 * session it addresses is named after its own uid, the visit comes off that
 * session, and the table comes off that visit.
 */
export const requestTableAssistance = onAppCheck<RequestTableAssistanceRequest>(
  (request) => requestTableAssistanceHandler(request),
);
