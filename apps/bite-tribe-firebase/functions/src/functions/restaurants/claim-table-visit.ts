import { getAuth } from 'firebase-admin/auth';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { CallableRequest, HttpsError } from 'firebase-functions/https';
import { onAppCheck } from '../shared/callable-options';
import { requireMember } from '../shared/roles';
import {
  TABLE_SESSIONS_COLLECTION,
  isEndedSession,
  tableSessionId,
} from './table-session';
import {
  TableVisitClaimResult,
  mergeTableSessions,
  refuseClaim,
} from './table-visit-claim';
import { TABLE_ASSISTANCE_REQUESTS_COLLECTION } from './table-assistance';
import { RESTAURANT_COLLECTION } from './restaurant-authority';
import { TABLE_ORDERS_COLLECTION } from './table-order';
import { TABLE_VISITS_COLLECTION } from './table-visit';

export interface ClaimTableVisitRequest {
  /** The restaurant the guest is sitting in, off the scan they already made. */
  restaurantId?: unknown;
  /** The table they scanned, which names the session document. */
  tableId?: unknown;
  /** An ID token of the anonymous session, taken before signing in. */
  guestIdToken?: unknown;
}

const getString = (data: Record<string, unknown>, field: string): string =>
  typeof data[field] === 'string' ? (data[field] as string).trim() : '';

/**
 * The uid the proof belongs to, or a refusal.
 *
 * `verifyIdToken` is Firebase's own verification - signature, audience, issuer,
 * expiry - with `checkRevoked` so a session signed out of elsewhere cannot be
 * cashed in afterwards. **Holding the token is the authorisation**: it is a
 * credential only that session's phone ever had, and it is the only thing that
 * ties the person now signed in to the meal they ordered anonymously.
 *
 * The provider is checked as well, and that is the half that makes this safe to
 * expose. Without it, a token belonging to *any* account would move *that*
 * account's table session to the caller - which is a way to claim a stranger's
 * dinner rather than one's own.
 */
const claimedGuestOf = async (
  guestIdToken: string,
): Promise<{ uid: string } | { reason: 'notAnAnonymousSession' }> => {
  try {
    const decoded = await getAuth().verifyIdToken(guestIdToken, true);

    return decoded.firebase?.sign_in_provider === 'anonymous'
      ? { uid: decoded.uid }
      : { reason: 'notAnAnonymousSession' };
  } catch (error) {
    logger.warn('claimTableVisit: the guest token did not verify', error);

    return { reason: 'notAnAnonymousSession' };
  }
};

/**
 * Moves one anonymous table session onto the account the guest signed into
 * (GitHub issue #1658).
 *
 * ## Why a callable at all
 *
 * Every document it touches is `allow write: if false` for a client, and it
 * rewrites ownership of documents the caller does not own - which is the care
 * this exists to take. Both uids have to be proved to belong to the same person
 * at the moment of the call: the signed-in one from `request.auth`, the
 * anonymous one from a token only the phone that held that session ever had.
 *
 * ## What moves
 *
 * The session document is **named** after the uid, so it cannot be updated in
 * place: the move is a write under the new name and a delete of the old, in one
 * transaction with everything else. The orders follow by `guestUserId` and
 * `sessionId`, and the signals the guest raised follow by `requestedByUserIds`
 * - a waiter call the guest can no longer see is a call they will make again.
 *
 * **Nothing the guest agreed to changes.** An order keeps its lines, its
 * prices, its currency, its total and its status (`RD-TS-9`, `RD-TS-11`); what
 * changes is whose it is.
 *
 * ## What it refuses
 *
 * A caller who is not the account the token names, a token that is not a live
 * anonymous session's, a session that is not there, and two live sessions in
 * different visits - because merging those would move one party's order list
 * onto another party's table.
 */
export const claimTableVisitFor = async (
  memberUserId: string,
  restaurantId: string,
  tableId: string,
  guestUserId: string,
): Promise<TableVisitClaimResult> => {
  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);
  const sessions = restaurantRef.collection(TABLE_SESSIONS_COLLECTION);
  const sourceRef = sessions.doc(tableSessionId(tableId, guestUserId));
  const targetId = tableSessionId(tableId, memberUserId);
  const targetRef = sessions.doc(targetId);

  return firestore.runTransaction(async (transaction) => {
    const [sourceSnapshot, targetSnapshot] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(targetRef),
    ]);

    if (!sourceSnapshot.exists) {
      return refuseClaim('sessionNotFound');
    }

    const source = sourceSnapshot.data() as DocumentData;

    if (source['guestUserId'] !== guestUserId) {
      // The document is named after the uid, so this cannot happen without
      // somebody having written one by hand - and the name is not what
      // authorises the move, the field is.
      return refuseClaim('notTheClaimedGuest');
    }

    const target = targetSnapshot.exists
      ? (targetSnapshot.data() as DocumentData)
      : undefined;

    if (
      target &&
      !isEndedSession(target) &&
      !isEndedSession(source) &&
      typeof target['visitId'] === 'string' &&
      typeof source['visitId'] === 'string' &&
      target['visitId'] !== source['visitId']
    ) {
      return refuseClaim('visitMismatch');
    }

    const merged = mergeTableSessions(source, target, targetId, memberUserId);
    const visitId =
      typeof merged['visitId'] === 'string' ? merged['visitId'] : '';

    const orderRefs: DocumentReference[] = [];

    if (visitId) {
      const placed = await transaction.get(
        restaurantRef
          .collection(TABLE_VISITS_COLLECTION)
          .doc(visitId)
          .collection(TABLE_ORDERS_COLLECTION)
          .where('guestUserId', '==', guestUserId),
      );

      placed.docs.forEach((order) => orderRefs.push(order.ref));
    }

    const raised = await transaction.get(
      restaurantRef
        .collection(TABLE_ASSISTANCE_REQUESTS_COLLECTION)
        .where('requestedByUserIds', 'array-contains', guestUserId),
    );

    transaction.set(targetRef, merged);
    transaction.delete(sourceRef);

    orderRefs.forEach((order) =>
      transaction.update(order, {
        guestUserId: memberUserId,
        sessionId: targetId,
      }),
    );

    raised.docs.forEach((request) => {
      const readers = request.data()['requestedByUserIds'];
      const kept = (Array.isArray(readers) ? readers : []).filter(
        (reader) => reader !== guestUserId && reader !== memberUserId,
      );

      transaction.update(request.ref, {
        requestedByUserIds: [...kept, memberUserId],
      });
    });

    return {
      ok: true as const,
      sessionId: targetId,
      ...(visitId ? { visitId } : {}),
      movedOrders: orderRefs.length,
    };
  });
};

export const claimTableVisitHandler = async (
  request: CallableRequest<ClaimTableVisitRequest>,
): Promise<TableVisitClaimResult> => {
  requireMember(request, 'You must be signed in to bring your table order.');

  const data = (request.data ?? {}) as Record<string, unknown>;
  const restaurantId = getString(data, 'restaurantId');
  const tableId = getString(data, 'tableId');
  const guestIdToken = getString(data, 'guestIdToken');

  if (!restaurantId || !tableId || !guestIdToken) {
    throw new HttpsError(
      'invalid-argument',
      'A restaurant, a table and the guest session are all required.',
    );
  }

  const claimed = await claimedGuestOf(guestIdToken);

  if ('reason' in claimed) {
    return refuseClaim(claimed.reason);
  }

  const memberUserId = request.auth?.uid ?? '';

  if (claimed.uid === memberUserId) {
    // The account already holds the session. Issue #1657 upgraded it in place,
    // which is the ordinary path, and there is nothing here to move.
    return refuseClaim('alreadyYours');
  }

  const result = await claimTableVisitFor(
    memberUserId,
    restaurantId,
    tableId,
    claimed.uid,
  );

  if (result.ok) {
    // Best effort, and after the move rather than as part of it: a uid with
    // nothing filed under it should not linger as an identity somebody can
    // sign into, and a delete that fails must not undo a meal that has already
    // changed hands.
    try {
      await getAuth().deleteUser(claimed.uid);
    } catch (error) {
      logger.warn(
        'claimTableVisit: the anonymous account was not deleted',
        error,
      );
    }
  }

  return result;
};

export const claimTableVisit = onAppCheck<ClaimTableVisitRequest>(
  claimTableVisitHandler,
);
