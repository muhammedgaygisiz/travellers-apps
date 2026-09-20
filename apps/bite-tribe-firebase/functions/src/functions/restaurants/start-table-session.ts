import { logger } from 'firebase-functions';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { recordScanAnomaly } from './record-scan-anomaly';
import { RESTAURANT_COLLECTION } from './restaurant-authority';
import {
  assertWithinScanRateLimit,
  parseScannedToken,
  resolveScan,
} from './resolve-table-qr-token';
import {
  ScanPosition,
  isDistantScan,
  manySessionsThreshold,
  parseScanPosition,
  scanDistanceMeters,
} from './scan-anomaly';
import {
  TableOrderingAvailability,
  TableScanContext,
  TableScanResult,
  refuseScan,
} from './table-scan';
import {
  TABLE_SESSIONS_COLLECTION,
  TABLE_SESSION_LIVE_STATUSES,
  TableSession,
  TableSessionStatus,
  isEndedSession,
  isExpiredSession,
  tableOrderingOf,
  tableSessionId,
  tableSessionIdleTimeoutMs,
} from './table-session';
import { TABLE_STATES_COLLECTION, visitIdOf } from './table-state';
import { TABLE_VISITS_COLLECTION, isOpenVisit } from './table-visit';
import { isAnonymousSession } from '../shared/roles';

/**
 * Attaches the guest who scanned a code to the party at that table
 * (GitHub issue #1101).
 *
 * ## What this costs the restaurant, and why that is the whole design
 *
 * `resolveTableQrToken` writes nothing, so the worst a scan of a photographed
 * sticker can do is learn that a restaurant is open. This is the first call
 * that writes, and a QR code still proves nothing about where the guest is
 * standing. So the answer is not "trust the scan" and not "refuse the scan" but
 * a third thing: the session is `pending` until staff seat the table, and
 * `pending` cannot order. A remote scan therefore produces one row on a screen
 * in the restaurant, and never a table marked occupied by somebody who is not
 * there.
 *
 * When the table *is* already seated, the guest is `active` immediately. There
 * is nothing left to confirm - staff have confirmed that a party is at this
 * table, and which of them is holding the phone is not a question the
 * restaurant should be asked.
 *
 * ## One visit, however many phones
 *
 * The join is not a check. It follows `TableState.visitId`, which is the single
 * pointer at an open visit and is written and dropped by the same commit that
 * moves the table's status (issue #1095) - so the second guest to scan reaches
 * the visit the first one is in because there is only one place to look. It
 * also makes "a guest cannot join a closed visit" true rather than enforced:
 * ending the visit dropped the pointer, so there is nothing to join and the
 * next scan is a new pending session, which is the honest description of a
 * party that came back after the table was cleared.
 *
 * The pointer is still checked against the visit document inside the
 * transaction. A state pointing at a visit that is not open should not exist,
 * and if one ever does, the guest must not be attached to it.
 *
 * ## Re-scanning
 *
 * Idempotent by the document name: the session is the derived name, so a
 * guest who scans the code again - because they reloaded, or because the
 * confirmation screen was the last thing they had open - addresses the session
 * they already have. It keeps its `startedAt`, has its `lastActiveAt` pushed
 * forward, and gains the visit if the table has been seated since. A second
 * document for one phone at one table is not reachable.
 *
 * A session that has *ended* is replaced rather than revived. Ending is
 * one-way, here as on the visit: the guest who left and scanned again is
 * starting something new, and the `closed` session that names the visit they
 * were in stays the record of the one they were in.
 *
 * ## Why the scan is resolved again
 *
 * Because the client's resolution is as old as the time the guest spent reading
 * the confirmation screen, and the kitchen can pause in that time. The checks
 * are `resolveScan` itself rather than a copy, so the order of them - which
 * issue #1100 calls the contract - cannot differ between the two callables.
 */

export interface StartTableSessionRequest {
  token?: unknown;
  /**
   * A coarse position the guest chose to share (GitHub issue #1107).
   *
   * Absent for every guest who declined the permission, whose device had no
   * fix, or whose client predates the field - and absent has to behave exactly
   * like present-and-nearby, because a check that penalises a refusal is not
   * optional. Nothing below branches on it except the anomaly it may raise:
   * the session, the status, the visit and the menu are identical either way.
   *
   * The coordinates are compared to the restaurant's and discarded. What can
   * survive is a rounded distance on an anomaly row, and only when the scan was
   * far enough away for one - see `scan-anomaly.ts` in the model library.
   */
  position?: unknown;
}

export interface TableSessionStarted {
  ok: true;
  status: Extract<TableSessionStatus, 'pending' | 'active'>;
  session: TableSession;
  context: TableScanContext;
}

/**
 * A scan that resolved to a restaurant the guest cannot order from
 * (GitHub issue #1102).
 *
 * A third outcome, and it exists because #1102 made "resolved" and "orderable"
 * two different things. A menu-only restaurant resolves: the code is valid, the
 * table is real and the menu is worth reading. What it does not do is take
 * orders, and a session is the thing that exists in order to place them - so
 * starting one here would hand a guest a session that can never be used, and
 * put a row on a screen in a restaurant that is not watching one.
 *
 * The client already knows, because the scan told it. This is the backend
 * declining to take the client's word for it, which is the same reason the scan
 * is resolved a second time here at all.
 */
export interface TableSessionOrderingUnavailable {
  ok: false;
  ordering: Extract<TableOrderingAvailability, { available: false }>;
}

/**
 * The refusal is the scan's, unchanged.
 *
 * Starting a session is a scan plus a write, so every way it fails before the
 * write is a way the scan fails, and the guest is owed the same ten sentences
 * whichever call produced them. A parallel reason list would be ten more
 * strings meaning the same ten things.
 */
export type StartTableSessionResult =
  | TableSessionStarted
  | TableSessionOrderingUnavailable
  | Extract<TableScanResult, { ok: false }>;

/**
 * The uid the session belongs to, and whether it is an anonymous one.
 *
 * Auth is required and the account may be anonymous, which is the one place in
 * the backend where that is deliberately true. A guest at a table has no
 * BiteTribe account and may never want one; what the session needs is a
 * *stable* identity, so that the guest's phone can read its own session
 * document through the rules and so that `linkWith*` can turn it into an
 * account later without the session changing hands.
 *
 * `provider_id` is `anonymous` on a token minted by `signInAnonymously`. It is
 * read rather than inferred from an absent email, because an account created
 * with a phone number has no email either and is not anonymous.
 */
const guestOf = (
  request: CallableRequest<unknown>,
): { uid: string; isAnonymous: boolean } => {
  if (!request.auth?.uid) {
    throw new HttpsError(
      'unauthenticated',
      'Sign in, anonymously or otherwise, before starting a table session.',
    );
  }

  return {
    uid: request.auth.uid,
    isAnonymous: isAnonymousSession(request),
  };
};

/**
 * The visit the guest joins, or `''` when the table is not seated.
 *
 * Both halves are required. The pointer says which visit, and the visit
 * document says whether it is still open - and a pointer left behind by a
 * commit that should have dropped it must not seat a guest at a party that
 * ended.
 */
const openVisitAt = async (
  transaction: FirebaseFirestore.Transaction,
  restaurantRef: FirebaseFirestore.DocumentReference,
  tableId: string,
): Promise<string> => {
  const state = await transaction.get(
    restaurantRef.collection(TABLE_STATES_COLLECTION).doc(tableId),
  );
  const visitId = visitIdOf(state.data());

  if (!visitId) {
    return '';
  }

  const visit = await transaction.get(
    restaurantRef.collection(TABLE_VISITS_COLLECTION).doc(visitId),
  );

  return isOpenVisit(visit.data()) ? visitId : '';
};

/**
 * Whether the guest already holds this session, or is starting a new one.
 *
 * An expired session counts as a new one. It has gone idle, so its `startedAt`
 * describes a meal that is over; carrying it forward would give the new session
 * a start time hours before the guest sat down, and the duration a staff screen
 * renders from it would be a lie.
 */
const isResumable = (
  existing: DocumentData | undefined,
  idleTimeoutMs: number,
  now: number,
): boolean =>
  existing !== undefined &&
  !isEndedSession(existing) &&
  !isExpiredSession(existing, idleTimeoutMs, now);

/**
 * How many live sessions the table holds, capped at one past the threshold
 * (GitHub issue #1107).
 *
 * A query rather than a counter on the table, because a counter is a second
 * version of a fact the session documents already hold and would have to be
 * decremented by three different ways of ending a session. `limit` is what
 * keeps it cheap: the question is "is it more than this", so reading one past
 * the threshold answers it and a table with two hundred sessions costs the same
 * as a table with seven.
 *
 * It needs an index the automatic ones do not cover - a composite on `tableId`
 * and `status`, in `firestore.indexes.json`, and indexes deploy by hand.
 */
const liveSessionsAt = async (
  restaurantRef: FirebaseFirestore.DocumentReference,
  tableId: string,
  cap: number,
): Promise<number> =>
  (
    await restaurantRef
      .collection(TABLE_SESSIONS_COLLECTION)
      .where('tableId', '==', tableId)
      .where('status', 'in', [...TABLE_SESSION_LIVE_STATUSES])
      .limit(cap)
      .get()
  ).size;

/**
 * The rows a session that started perfectly normally may still be worth
 * (GitHub issue #1107).
 *
 * Run **after** the commit and never inside it, which is the decision worth
 * finding again. An anomaly is a report about a session that already exists, so
 * folding these reads into the transaction would put a collection query in the
 * read set of every scan in the product, and a contended retry on the one
 * document a guest is waiting for - to decide something no caller reads.
 *
 * Both kinds are computed here rather than at the caller because they share the
 * one condition that matters: neither is evaluated for a guest who was merely
 * resuming a session they already had. A phone that reloads the confirmation
 * screen has not added a person to the table and has not moved.
 *
 * ## Why the whole of it is caught, and not just the writes
 *
 * `recordScanAnomaly` swallows its own failures, which made the *writes* safe
 * and left {@link liveSessionsAt} exposed - and that query is the one call here
 * that can fail for a reason having nothing to do with this restaurant. It
 * needs a composite index, indexes in this repository deploy by hand, and the
 * emulator does not enforce them: so on the day the functions deploy and the
 * index deploy has not run, every new guest session would commit and then
 * answer the guest with `FAILED_PRECONDITION`. A session that exists, reported
 * as a failure, because a row on a staff screen could not be counted.
 *
 * So the guarantee is made here rather than assembled from the guarantees of
 * the things called: **nothing this function does can change what the caller
 * got.** That is what the sentence above it always claimed, and it is now true
 * by construction rather than by every callee happening to be careful.
 */
const reportSessionAnomalies = async (
  restaurantRef: FirebaseFirestore.DocumentReference,
  subject: { restaurantId: string; tableId: string; tableLabel: string },
  seats: number,
  restaurantPosition: unknown,
  position: ScanPosition | undefined,
  now: number,
): Promise<void> => {
  try {
    await reportSessionAnomaliesOrThrow(
      restaurantRef,
      subject,
      seats,
      restaurantPosition,
      position,
      now,
    );
  } catch (error) {
    logger.warn('startTableSession: could not report session anomalies', {
      restaurantId: subject.restaurantId,
      tableId: subject.tableId,
      error,
    });
  }
};

/** The reporting itself, which is allowed to fail because nothing sees it. */
const reportSessionAnomaliesOrThrow = async (
  restaurantRef: FirebaseFirestore.DocumentReference,
  subject: { restaurantId: string; tableId: string; tableLabel: string },
  seats: number,
  restaurantPosition: unknown,
  position: ScanPosition | undefined,
  now: number,
): Promise<void> => {
  const threshold = manySessionsThreshold(seats);
  const sessionCount = await liveSessionsAt(
    restaurantRef,
    subject.tableId,
    threshold + 1,
  );

  if (sessionCount > threshold) {
    await recordScanAnomaly({
      ...subject,
      kind: 'manySessions',
      now,
      sessionCount,
    });
  }

  const restaurantAt = restaurantPosition as
    { latitude?: unknown; longitude?: unknown } | undefined;

  if (
    !position ||
    typeof restaurantAt?.latitude !== 'number' ||
    typeof restaurantAt?.longitude !== 'number'
  ) {
    return;
  }

  const distanceMeters = scanDistanceMeters(position, {
    latitude: restaurantAt.latitude,
    longitude: restaurantAt.longitude,
  });

  if (isDistantScan(distanceMeters, position.accuracyMeters)) {
    await recordScanAnomaly({
      ...subject,
      kind: 'distantScan',
      now,
      distanceMeters,
    });
  }
};

export const startTableSessionHandler = async (
  request: CallableRequest<StartTableSessionRequest>,
  now: Date = new Date(),
): Promise<StartTableSessionResult> => {
  const raw = parseScannedToken(request.data?.token);
  const guest = guestOf(request);
  // Parsed before anything is checked and used after everything is written. A
  // malformed position is dropped rather than refused, for the reason an absent
  // one is: the field is optional, so sending a bad one must cost the guest no
  // more than sending none.
  const position = parseScanPosition(request.data?.position);

  await assertWithinScanRateLimit(request, raw, now, 'startTableSession');

  const { result, restaurant } = await resolveScan(raw, now);

  if (!result.ok) {
    return result;
  }

  // Unreachable: `resolveScan` returns the restaurant on every resolved path.
  // Written as a refusal rather than a cast, because the cast that made this
  // one branch would hand the client an `ok: true` with no session on it - a
  // screen waiting forever for a confirmation that already arrived.
  if (!restaurant) {
    return refuseScan('restaurantNotFound');
  }

  // Resolved is not orderable since issue #1102. A menu-only restaurant, and a
  // kitchen that has paused, both resolve - and neither takes an order, so a
  // session at either is a session that can never be used.
  if (!result.ordering.available) {
    return { ok: false, ordering: result.ordering };
  }

  const context: TableScanContext = {
    token: result.token,
    restaurant: result.restaurant,
    room: result.room,
    table: result.table,
    menu: result.menu,
    ordering: result.ordering,
  };
  const restaurantId = result.restaurant.id;
  const tableId = result.table.id;
  const idleTimeoutMs = tableSessionIdleTimeoutMs(
    tableOrderingOf(restaurant)['sessionIdleTimeoutMinutes'],
  );

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const sessionRef = restaurantRef
    .collection(TABLE_SESSIONS_COLLECTION)
    .doc(tableSessionId(tableId, guest.uid));

  const { session, created } = await firestore.runTransaction(
    async (transaction) => {
      // The state and the visit are read inside the transaction because a host
      // can seat or free this table between the resolution above and the commit.
      // The guest being attached to a visit that ended a second ago is precisely
      // the case the pointer exists to close.
      const visitId = await openVisitAt(transaction, restaurantRef, tableId);
      const existing = (await transaction.get(sessionRef)).data();
      const at = now.getTime();
      const resuming = isResumable(existing, idleTimeoutMs, at);

      const next: TableSession = {
        id: sessionRef.id,
        restaurantId,
        tableId,
        guestUserId: guest.uid,
        status: visitId ? 'active' : 'pending',
        ...(visitId ? { visitId } : {}),
        startedAt:
          resuming && typeof existing?.['startedAt'] === 'number'
            ? (existing['startedAt'] as number)
            : at,
        lastActiveAt: at,
        // Read off the token that is starting the session rather than carried
        // forward from the stored document. A guest who registered between two
        // scans is no longer anonymous, and the session that says otherwise is
        // the one a later reader would trust.
        isAnonymousGuest: guest.isAnonymous,
      };

      // Replaced rather than merged, for the reason the table state is: a
      // resumed session must not keep an `endedAt` or a `visitId` from a party
      // that is over, and a merge is how one of those survives.
      transaction.set(sessionRef, next);

      return { session: next, created: !resuming };
    },
  );

  // After the commit, and never allowed to change what it produced. A guest
  // whose session is real must not be told it failed because a row on a staff
  // screen could not be written, so `recordScanAnomaly` answers rather than
  // throwing and this is the last thing that happens (issue #1107).
  if (created) {
    await reportSessionAnomalies(
      restaurantRef,
      { restaurantId, tableId, tableLabel: result.table.label },
      result.table.seats,
      restaurant['position'],
      position,
      now.getTime(),
    );
  }

  return {
    ok: true,
    status: session.status as Extract<TableSessionStatus, 'pending' | 'active'>,
    session,
    context,
  };
};

/**
 * Classified `authenticated` in `callable-authorization.spec.ts`, and it is the
 * only callable there for which an *anonymous* session is enough.
 *
 * That is the widest door in the backend by design, and what is behind it is
 * one document naming the caller's own uid. The caller cannot choose the
 * restaurant, the table or the visit: all three come from a token it had to
 * hold, checked against the twelve rules of issue #1100.
 */
export const startTableSession = onAppCheck<StartTableSessionRequest>(
  (request) => startTableSessionHandler(request),
);
