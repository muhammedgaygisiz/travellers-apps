import { Page } from '@playwright/test';
import { deleteFirestoreDocument, seedFirestoreDocument } from './firestore';
import { TEST_USERS } from './test-users';

/**
 * A table a guest can scan, sit at and order from (GitHub issue #1108).
 *
 * ## Why it is seeded rather than driven
 *
 * Everything before the order is somebody else's screen. A restaurant claims
 * itself, an owner draws a floor plan and prints a code, a host seats a party -
 * three apps and four epics, none of which this spec is about. What it is about
 * is the last hop, so the state those screens produce is written directly and
 * the guest's own half is driven for real: scan, confirm, browse, order.
 *
 * ## What the shape has to satisfy
 *
 * `resolveTableQrToken` runs twelve checks on every scan, and each one of them
 * is a field here: the restaurant exists, has an owner and is not revoked; it
 * takes table orders; it is open now; the table exists and is enabled; the
 * token is active; the menu exists, is available and states a currency.
 *
 * The **visit** is the one that is easy to miss. A table with no open visit
 * gives the guest a `pending` session - staff have not seated them - and a
 * pending session cannot order. So the seating a host would have done is
 * written too: an open visit and a `tableStates` document pointing at it.
 */
export interface TableOrderFixture {
  restaurantId: string;
  restaurantName: string;
  roomId: string;
  tableId: string;
  tableLabel: string;
  menuId: string;
  visitId: string;
  /** The printed code, in the alphabet `normalizeScannedToken` accepts. */
  token: string;
  dishName: string;
  dishPrice: number;
}

export const TABLE_ORDER_FIXTURE: TableOrderFixture = {
  restaurantId: 'e2e-table-order-restaurant',
  restaurantName: 'Flaky Wifi Bistro',
  roomId: 'e2e-table-order-room',
  tableId: 'e2e-table-order-table',
  tableLabel: '12',
  menuId: 'e2e-table-order-menu',
  visitId: 'e2e-table-order-visit',
  token: 'ABCDEFGHJKMNPQRSTVWXYZ0123',
  dishName: 'Margherita',
  dishPrice: 12,
};

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

/**
 * Open every day, all day.
 *
 * A restaurant that closes would make the suite fail by the clock rather than
 * by the code, and "is it open at half past two on a Tuesday" is
 * `resolve-table-qr-token`'s own specs to answer.
 */
const openingHours = {
  arrayValue: {
    values: DAYS.map((day) => ({
      mapValue: {
        fields: {
          day: { stringValue: day },
          isOpen: { booleanValue: true },
          timeRanges: {
            arrayValue: {
              values: [
                {
                  mapValue: {
                    fields: {
                      from: { stringValue: '00:00' },
                      to: { stringValue: '23:59' },
                    },
                  },
                },
              ],
            },
          },
        },
      },
    })),
  },
};

const menuItem = (fixture: TableOrderFixture): Record<string, unknown> => ({
  mapValue: {
    fields: {
      id: { stringValue: 'e2e-table-order-dish' },
      name: { stringValue: fixture.dishName },
      description: { stringValue: 'Tomato and mozzarella' },
      price: { integerValue: String(fixture.dishPrice) },
      isAvailable: { booleanValue: true },
    },
  },
});

export const seedOrderableTable = async (
  page: Page,
  fixture: TableOrderFixture = TABLE_ORDER_FIXTURE,
  now: number = Date.now(),
): Promise<void> => {
  await seedFirestoreDocument(page, `restaurants/${fixture.restaurantId}`, {
    id: { stringValue: fixture.restaurantId },
    name: { stringValue: fixture.restaurantName },
    description: { stringValue: 'A restaurant whose wifi drops things.' },
    menuId: { stringValue: fixture.menuId },
    ownerUserId: { stringValue: TEST_USERS.organisation.uid },
    claimStatus: { stringValue: 'claimed' },
    openingHours,
    tableOrdering: {
      mapValue: {
        fields: {
          enabled: { booleanValue: true },
          timeZone: { stringValue: 'Europe/Berlin' },
        },
      },
    },
  });

  await Promise.all([
    seedFirestoreDocument(page, `menus/${fixture.menuId}`, {
      id: { stringValue: fixture.menuId },
      restaurantId: { stringValue: fixture.restaurantId },
      currency: { stringValue: 'EUR' },
      categories: {
        arrayValue: {
          values: [
            {
              mapValue: {
                fields: {
                  id: { stringValue: 'e2e-table-order-category' },
                  title: { stringValue: 'Pizza' },
                  items: { arrayValue: { values: [menuItem(fixture)] } },
                },
              },
            },
          ],
        },
      },
    }),

    seedFirestoreDocument(
      page,
      `restaurants/${fixture.restaurantId}/rooms/${fixture.roomId}`,
      {
        id: { stringValue: fixture.roomId },
        name: { stringValue: 'Main dining room' },
        order: { integerValue: '0' },
      },
    ),

    seedFirestoreDocument(
      page,
      `restaurants/${fixture.restaurantId}/tables/${fixture.tableId}`,
      {
        label: { stringValue: fixture.tableLabel },
        roomId: { stringValue: fixture.roomId },
        seats: { integerValue: '4' },
        enabled: { booleanValue: true },
        shape: { stringValue: 'round' },
        diameter: { integerValue: '900' },
        rotation: { integerValue: '0' },
        position: {
          mapValue: {
            fields: {
              x: { integerValue: '2000' },
              y: { integerValue: '3000' },
            },
          },
        },
      },
    ),

    seedFirestoreDocument(page, `tableTokens/${fixture.token}`, {
      restaurantId: { stringValue: fixture.restaurantId },
      roomId: { stringValue: fixture.roomId },
      tableId: { stringValue: fixture.tableId },
      tableLabel: { stringValue: fixture.tableLabel },
      tableEnabled: { booleanValue: true },
      status: { stringValue: 'active' },
      issuedAt: { stringValue: new Date(now).toISOString() },
      issuedAtTimestamp: { integerValue: String(now) },
    }),

    // The seating a host would have done. Without it the guest's session is
    // `pending` and nothing can be ordered from it.
    seedFirestoreDocument(
      page,
      `restaurants/${fixture.restaurantId}/visits/${fixture.visitId}`,
      {
        id: { stringValue: fixture.visitId },
        restaurantId: { stringValue: fixture.restaurantId },
        tableId: { stringValue: fixture.tableId },
        status: { stringValue: 'open' },
        openedAt: { integerValue: String(now) },
      },
    ),

    seedFirestoreDocument(
      page,
      `restaurants/${fixture.restaurantId}/tableStates/${fixture.tableId}`,
      {
        tableId: { stringValue: fixture.tableId },
        restaurantId: { stringValue: fixture.restaurantId },
        status: { stringValue: 'occupied' },
        since: { integerValue: String(now) },
        updatedByUserId: { stringValue: TEST_USERS.organisation.uid },
        visitId: { stringValue: fixture.visitId },
      },
    ),
  ]);
};

/**
 * Hands the fixture back, orders and sessions included.
 *
 * The emulator keeps every write for the whole run, so a table left seated and
 * an order left under it would be visible to whatever runs next.
 */
export const deleteOrderableTable = async (
  page: Page,
  fixture: TableOrderFixture = TABLE_ORDER_FIXTURE,
): Promise<void> => {
  await deleteFirestoreDocument(page, `tableTokens/${fixture.token}`);
  await deleteFirestoreDocument(
    page,
    `restaurants/${fixture.restaurantId}/tableStates/${fixture.tableId}`,
  );
  await deleteFirestoreDocument(
    page,
    `restaurants/${fixture.restaurantId}/visits/${fixture.visitId}`,
  );
  await deleteFirestoreDocument(
    page,
    `restaurants/${fixture.restaurantId}/tables/${fixture.tableId}`,
  );
  await deleteFirestoreDocument(
    page,
    `restaurants/${fixture.restaurantId}/rooms/${fixture.roomId}`,
  );
  await deleteFirestoreDocument(page, `menus/${fixture.menuId}`);
  await deleteFirestoreDocument(page, `restaurants/${fixture.restaurantId}`);
};
