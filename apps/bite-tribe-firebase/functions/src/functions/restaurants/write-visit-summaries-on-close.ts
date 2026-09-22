import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/firestore';
import {
  RESTAURANT_COLLECTION,
  TABLES_COLLECTION,
} from './restaurant-authority';
import { TABLE_ORDERS_COLLECTION } from './table-order';
import { TABLE_SESSIONS_COLLECTION } from './table-session';
import { TABLE_VISIT_END_STATUSES } from './table-visit';
import {
  TableVisitBillLine,
  tableVisitBillLines,
  tableVisitBillTotal,
} from './table-visit-bill';
import {
  USERS_COLLECTION,
  VISIT_SUMMARIES_COLLECTION,
  VisitSummary,
} from './visit-summary';

/**
 * Files the meal under each guest who ate it, when the visit ends
 * (GitHub issue #1111).
 *
 * ## Why a trigger and not part of the close
 *
 * The reason `notifyStaffOnNewTableOrder` gives for the same shape: the close
 * must land whatever this does. `transitionTableState` is already a
 * transaction over the table's state, its audit entry, the visit and every
 * session under it, and it is what a host is watching a table move on. Reading
 * the whole order subcollection inside it to build a document nobody is
 * waiting for would make the seating flow pay for the summary, and a failure
 * here would roll back a close that had otherwise succeeded - leaving a party
 * recorded at a table they have left.
 *
 * So the summary is a **consequence** of closing rather than part of it. What
 * that costs is atomicity: a guest who opens the screen in the second after
 * the close may find nothing yet, which the screen answers by saying the
 * summary is being prepared rather than by saying there is none.
 *
 * ## It fires on the ending and on nothing else
 *
 * An update that leaves `status` alone is a settlement being recorded
 * (`settleTableVisit`, issue #1110) or a party being moved, and neither ends a
 * meal. The guard is the transition into a terminal status rather than the
 * status itself, so a document written twice - a retry, a replayed event -
 * finds the visit already closed on both sides and does nothing. Triggers are
 * at-least-once, and this one is written to be run more than once.
 *
 * ## Every guest, including the one who left early
 *
 * One document per session that ever reached `active`, which is every phone
 * that was attached to the party rather than every phone that ordered. A guest
 * who left before the bill still ate, and a guest who ordered nothing still sat
 * there; both get the same summary, because the bill is the party's and the
 * rows name nobody (`RD-TS-47`).
 *
 * A `pending` session gets none: staff never confirmed anybody was at that
 * table, and filing a stranger's dinner under the account of somebody who
 * photographed a sticker from the pavement is the failure mode `RD-TS-1`
 * exists to prevent.
 */

/** Whether a stored value is a position this backend will copy. */
const isGeopoint = (
  value: unknown,
): value is { latitude: number; longitude: number } =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { latitude?: unknown }).latitude === 'number' &&
  typeof (value as { longitude?: unknown }).longitude === 'number';

/** The sessions of one visit that were ever really at the table. */
const seatedGuestIdsOf = (
  documents: readonly { data: () => Record<string, unknown> }[],
  visitId: string,
): string[] => {
  const ids = new Set<string>();

  for (const document of documents) {
    const session = document.data();

    // `pending` never names a visit, so this filter is also what excludes it -
    // but it is written on the visit id rather than on the status, because a
    // session that has since gone `left`, `expired` or `closed` was still at
    // the table and still ate.
    if (session['visitId'] !== visitId) {
      continue;
    }

    const guestUserId = session['guestUserId'];

    if (typeof guestUserId === 'string' && guestUserId) {
      ids.add(guestUserId);
    }
  }

  return [...ids];
};

/**
 * What the trigger does, with the event unwrapped.
 *
 * Exported so the emulator specs can exercise it directly: the Firestore
 * emulator runs without the functions emulator in this suite, so a trigger
 * that could only be reached by writing a document could not be tested at all.
 * The wrapper below adds nothing but the event shape.
 */
export const writeVisitSummaries = async (
  restaurantId: string,
  visitId: string,
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): Promise<void> => {
  if (!before || !after) {
    return;
  }

  const endings: readonly string[] = TABLE_VISIT_END_STATUSES;
  const wasOpen = !endings.includes(String(before['status']));
  const hasEnded = endings.includes(String(after['status']));

  if (!wasOpen || !hasEnded) {
    return;
  }

  const firestore = getFirestore();
  const restaurantRef = firestore
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId);

  const tableId =
    typeof after['tableId'] === 'string' ? after['tableId'] : undefined;

  const [restaurant, table, sessions, orders] = await Promise.all([
    restaurantRef.get(),
    tableId
      ? restaurantRef.collection(TABLES_COLLECTION).doc(tableId).get()
      : Promise.resolve(undefined),
    restaurantRef.collection(TABLE_SESSIONS_COLLECTION).get(),
    restaurantRef
      .collection('visits')
      .doc(visitId)
      .collection(TABLE_ORDERS_COLLECTION)
      .get(),
  ]);

  const guestIds = seatedGuestIdsOf(sessions.docs, visitId);

  if (guestIds.length === 0) {
    // Nobody ever scanned. A table seated and cleared by staff alone is an
    // ordinary evening in a restaurant that does not use the QR code, and it
    // leaves nothing for anybody to keep.
    return;
  }

  // Cancelled orders are dropped for the reason `tableOrdersTotal` drops
  // them: a dish the kitchen will not cook will not be billed.
  const billable = orders.docs
    .map((document) => document.data())
    .filter((order) => order['status'] !== 'cancelled');

  const lines: TableVisitBillLine[] = tableVisitBillLines(billable);
  const currency =
    billable
      .map((order) => order['currency'])
      .find((value): value is string => typeof value === 'string') ?? '';

  const summary: VisitSummary = {
    id: visitId,
    restaurantId,
    // Copied rather than looked up on read: a restaurant that renames itself
    // has not changed where the guest ate in March.
    restaurantName:
      typeof restaurant.data()?.['name'] === 'string'
        ? (restaurant.data()?.['name'] as string)
        : '',
    tableLabel:
      typeof table?.data()?.['label'] === 'string'
        ? (table?.data()?.['label'] as string)
        : '',
    // Copied so a Bite made from this meal is filed where the food was eaten
    // rather than wherever the guest opens the app (issue #1112). The
    // restaurant document is already open for its name, so this is free.
    ...(isGeopoint(restaurant.data()?.['position'])
      ? { restaurantPosition: restaurant.data()?.['position'] }
      : {}),
    closedAt:
      typeof after['closedAt'] === 'number'
        ? (after['closedAt'] as number)
        : Date.now(),
    currency,
    lines,
    total: tableVisitBillTotal(lines),
    paymentStatus:
      after['paymentStatus'] === 'settled' ? 'settled' : 'unsettled',
    // Written rather than left absent, because the nightly reminder reads
    // every guest's summaries as a collection group and Firestore cannot ask
    // for a field that is not there (issue #1112).
    biteCreated: false,
    reminded: false,
    ...(typeof after['settlementMethod'] === 'string'
      ? {
          settlementMethod: after[
            'settlementMethod'
          ] as VisitSummary['settlementMethod'],
        }
      : {}),
  };

  const batch = firestore.batch();

  for (const guestUserId of guestIds) {
    batch.set(
      firestore
        .collection(USERS_COLLECTION)
        .doc(guestUserId)
        .collection(VISIT_SUMMARIES_COLLECTION)
        .doc(visitId),
      summary,
      // Merged rather than replaced, so a re-run cannot take `emailedAt`
      // away from a guest who has already had the summary sent. The trigger
      // is at-least-once and the field belongs to the guest, not to the
      // meal.
      { merge: true },
    );
  }

  await batch.commit();

  logger.info('visit summaries written', {
    restaurantId,
    visitId,
    guests: guestIds.length,
    lines: lines.length,
  });
};

export const writeVisitSummariesOnVisitClose = onDocumentUpdated(
  `${RESTAURANT_COLLECTION}/{restaurantId}/visits/{visitId}`,
  async (event) =>
    writeVisitSummaries(
      event.params.restaurantId,
      event.params.visitId,
      event.data?.before.data(),
      event.data?.after.data(),
    ),
);
