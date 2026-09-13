import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';
import {
  RESTAURANT_COLLECTION,
  RESTAURANT_STAFF_COLLECTION,
  TABLES_COLLECTION,
} from '../restaurants/restaurant-authority';
import { sendLocalizedNotification } from '../shared/utils/send-localized-notification';

/**
 * Tells the people on shift that a table has ordered (GitHub issue #1105).
 *
 * ## Why a trigger and not a send inside `submitTableOrder`
 *
 * Because the order must land whatever the notification does. A push that
 * cannot be delivered - no tokens, a cold messaging client, a network blip -
 * would otherwise either fail the submission the guest is watching, or have to
 * be swallowed inside a callable whose whole job is to be trustworthy about
 * what it wrote. Splitting them means an order is recorded once and announced
 * separately, which is also how every other notification in this codebase is
 * shaped.
 *
 * It fires on **create** and on nothing else. An order whose status moves is
 * the restaurant acting on its own decision; announcing that to the people who
 * made it would be a notification for every press of every button in the queue.
 *
 * ## Who it reaches
 *
 * The account the restaurant is assigned to, and every account with a staff
 * association naming it. Both, because a small restaurant is its own host and a
 * large one has the owner nowhere near the pass - and the two lists are read
 * from the same two places `worksAt()` in `firestore.rules` and
 * `requireTableStateAuthority` read, so who is told about an order is the same
 * set as who may act on it.
 *
 * The guest is not told. Their own screen is a live listener on the order
 * (issue #1104), which is a better answer than a push and does not need an
 * installation.
 *
 * ## Why the settings are respected by doing nothing
 *
 * `sendLocalizedNotification` resolves each account's *enabled* installations
 * and sends in each recipient's own language. Delivery is a per-installation
 * switch (issue #1184) and the language is an account preference (issue #1200),
 * and both are applied there. A trigger that wanted to reach a member of staff
 * who had turned notifications off would have to go round that function, and
 * the acceptance criterion of this issue is precisely that it does not.
 */

/** The accounts to tell about an order at this restaurant. */
const staffOf = async (restaurantId: string): Promise<string[]> => {
  const firestore = getFirestore();

  const [restaurant, associations] = await Promise.all([
    firestore.collection(RESTAURANT_COLLECTION).doc(restaurantId).get(),
    firestore
      .collection(RESTAURANT_STAFF_COLLECTION)
      .where('restaurantId', '==', restaurantId)
      .get(),
  ]);

  const ownerUserId = restaurant.data()?.['ownerUserId'];
  const uids = associations.docs.map((snapshot) => snapshot.id);

  // A `Set`, because the owner of a one-person restaurant is plausibly also on
  // the staff list - and two entries would be two notifications for one order.
  return [
    ...new Set(
      typeof ownerUserId === 'string' && ownerUserId
        ? [ownerUserId, ...uids]
        : uids,
    ),
  ];
};

/**
 * The table's number, as staff call it.
 *
 * Read from the table document rather than carried on the order, because the
 * order records a table *id* and the notification has to say "table 12". A
 * table deleted between the order and this read has no number left, and the
 * copy then names the restaurant alone rather than inventing one: `tableId` is
 * a generated string, and putting it in front of a waiter would be worse than
 * leaving it out.
 */
const tableLabelOf = async (
  restaurantId: string,
  tableId: string,
): Promise<string> => {
  if (!tableId) {
    return '';
  }

  const snapshot = await getFirestore()
    .collection(RESTAURANT_COLLECTION)
    .doc(restaurantId)
    .collection(TABLES_COLLECTION)
    .doc(tableId)
    .get();

  const label = snapshot.data()?.['label'];

  return typeof label === 'string' ? label : '';
};

export const notifyStaffOnNewTableOrder = onDocumentCreated(
  'restaurants/{restaurantId}/visits/{visitId}/orders/{orderId}',
  async (event) => {
    const order = event.data?.data();

    if (!order) {
      return;
    }

    const { restaurantId, visitId, orderId } = event.params;
    const tableId =
      typeof order['tableId'] === 'string' ? order['tableId'] : '';

    const [uids, tableLabel] = await Promise.all([
      staffOf(restaurantId),
      tableLabelOf(restaurantId, tableId),
    ]);

    logger.info('--- New table order, staff to notify:', uids.length);

    if (uids.length === 0) {
      logger.warn('--- Restaurant has no owner and no staff, aborting');

      return;
    }

    await sendLocalizedNotification({
      uids,
      data: {
        type: 'NEW_TABLE_ORDER',
        restaurantId,
        visitId,
        orderId,
        tableId,
        tableLabel,
      },
      buildMessage: (translate) => ({
        title: translate('newTableOrder.title'),
        // Two sentences rather than one with an optional clause, because a
        // notification that reads "New order at table" when the label is
        // missing is worse than one that does not mention a table at all.
        body: tableLabel
          ? translate('newTableOrder.body', { table: tableLabel })
          : translate('newTableOrder.bodyWithoutTable'),
      }),
    });
  },
);
