import { getFirestore } from 'firebase-admin/firestore';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import {
  RESTAURANT_COLLECTION,
  parseRequiredString,
} from './restaurant-authority';
import {
  TABLE_SESSIONS_COLLECTION,
  TableSessionStatus,
  isEndedSession,
  isTableSessionStatus,
  tableSessionId,
} from './table-session';

/**
 * Ends one guest's attachment to a table, and nobody else's
 * (GitHub issue #1101).
 *
 * ## What it deliberately does not do
 *
 * It does not touch the table, the visit or anybody else's session. A guest
 * leaving is one phone leaving: the friend who is still at the table is still
 * ordering, and the party is still the restaurant's to close. That is the whole
 * of the issue's "the guest can leave the session without affecting the other
 * guests", and it is why this writes one document and not three.
 *
 * Ending a *visit* is a staff action and stays `transitionTableState`'s. A
 * guest who could end a visit by tapping "leave" could clear a table they are
 * not sitting at, since the QR code never proved they were.
 *
 * ## Leaving something that already ended
 *
 * Answered with what it already is rather than refused. The guest who taps
 * leave on a session the restaurant closed a minute earlier has done nothing
 * wrong, and an error would be a screen apologising for an outcome they asked
 * for and already have. So the reply names the status, and a second tap is the
 * same reply.
 *
 * A session that never existed is `not-found`, which is different: that is a
 * client naming a table this guest never scanned, and answering it with "you
 * have left" would be inventing a session to end.
 */

export interface LeaveTableSessionRequest {
  restaurantId?: unknown;
  tableId?: unknown;
}

export interface LeaveTableSessionResult {
  restaurantId: string;
  tableId: string;
  /** What the session is now: `left`, or the ending it already had. */
  status: TableSessionStatus;
  /**
   * True when the session had already ended before this call.
   *
   * Absent rather than `false` on the ordinary path, following
   * `TransitionTableStateResult.replayed`: a caller reading it is reading a
   * deliberate field, and a screen can say "your table was closed" instead of
   * "you left" without comparing statuses itself.
   */
  alreadyEnded?: true;
}

/**
 * The caller's own uid.
 *
 * There is no `guestUserId` argument and there must not be one. The session's
 * document name is derived from the uid, so a caller can only ever address its
 * own - which is what makes "without affecting the other guests" structural
 * rather than a check somebody could drop.
 */
const guestUidOf = (request: CallableRequest<unknown>): string => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in to leave a table.');
  }

  return request.auth.uid;
};

export const leaveTableSessionHandler = async (
  request: CallableRequest<LeaveTableSessionRequest>,
  now: Date = new Date(),
): Promise<LeaveTableSessionResult> => {
  const restaurantId = parseRequiredString(
    request.data?.restaurantId,
    'restaurantId',
  );
  const tableId = parseRequiredString(request.data?.tableId, 'tableId');
  const guestUserId = guestUidOf(request);

  const firestore = getFirestore();
  const sessionRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLE_SESSIONS_COLLECTION)
    .doc(tableSessionId(tableId, guestUserId));

  return firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(sessionRef);

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'You have no session at that table.');
    }

    const existing = snapshot.data();

    if (isEndedSession(existing)) {
      const status = existing?.['status'];

      return {
        restaurantId,
        tableId,
        // A stored status this backend does not recognise reads as `closed`
        // rather than as itself. `isEndedSession` already treats it as ended,
        // and returning it verbatim would hand the scan screen a value it has
        // no sentence for - the blank refusal the whole reason list exists to
        // prevent.
        status: isTableSessionStatus(status) ? status : 'closed',
        alreadyEnded: true,
      };
    }

    // An update rather than a replacement: the session keeps the `startedAt`,
    // the visit it was in and how it began, and gains only that it is over.
    // What happened during dinner is the part a receipt is read from.
    transaction.update(sessionRef, {
      status: 'left',
      endedAt: now.getTime(),
    });

    return { restaurantId, tableId, status: 'left' as TableSessionStatus };
  });
};

/**
 * Classified `authenticated`, and anonymous is enough - the same door
 * `startTableSession` opens, onto the same one document.
 */
export const leaveTableSession = onAppCheck<LeaveTableSessionRequest>(
  (request) => leaveTableSessionHandler(request),
);
