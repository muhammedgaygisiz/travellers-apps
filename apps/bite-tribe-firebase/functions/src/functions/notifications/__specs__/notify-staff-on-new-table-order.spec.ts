import type { FakeFirestore } from '../../users/__specs__/fake-firestore';
import { createFakeFirestore } from '../../users/__specs__/fake-firestore';

let db: FakeFirestore;

interface MulticastRequest {
  tokens: string[];
  notification: { title: string; body: string };
  data: Record<string, string>;
  android?: { notification?: { tag?: string } };
}

const sendEachForMulticast = jest.fn(async ({ tokens }: MulticastRequest) => ({
  successCount: tokens.length,
  failureCount: 0,
  responses: tokens.map(() => ({ success: true })),
}));

/**
 * The trigger reads its collection names from `restaurant-authority.ts` and
 * `table-qr-tokens.ts` rather than spelling them again, and both of those
 * import `firebase-functions/https` - which reaches `jose`, ESM only and
 * unparseable by this project's ts-jest. Nothing under test calls a callable,
 * so the module is stubbed at the import boundary.
 *
 * Stubbed rather than the constants copied. A second spelling of
 * `restaurantStaff` in this file would be one that can drift from the spelling
 * the rules and the callables agree on, which is the whole reason those modules
 * export it.
 */
jest.mock('firebase-functions/https', () => ({}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: (): FakeFirestore => db,
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: (): { sendEachForMulticast: typeof sendEachForMulticast } => ({
    sendEachForMulticast,
  }),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_document: unknown, handler: unknown) => handler),
}));

const RESTAURANT = 'owned-restaurant';
const VISIT = 'visit-1';
const ORDER = 'order-1';
const TABLE = 'table-12';

type OrderDoc = { tableId?: string };

/**
 * The send path reaches Firestore through modules that take their handle at
 * import time, so the trigger is re-imported per test against a freshly seeded
 * store - the same shape the reply trigger's spec next door uses.
 */
const runTrigger = (order: OrderDoc = { tableId: TABLE }): Promise<void> => {
  const handler = (
    require('../notify-staff-on-new-table-order') as typeof import('../notify-staff-on-new-table-order')
  ).notifyStaffOnNewTableOrder as unknown as (event: {
    data: { data: () => OrderDoc } | undefined;
    params: { restaurantId: string; visitId: string; orderId: string };
  }) => Promise<void>;

  return handler({
    data: { data: () => order },
    params: { restaurantId: RESTAURANT, visitId: VISIT, orderId: ORDER },
  });
};

const seedInstallation = (uid: string, enabled = true): void => {
  db.seed(`users/${uid}/pushTokens/token-${uid}`, { enabled });
};

const seedStaff = (uid: string, restaurantId = RESTAURANT): void => {
  db.seed(`restaurantStaff/${uid}`, { userId: uid, restaurantId });
  seedInstallation(uid);
};

const sent = (): MulticastRequest[] =>
  sendEachForMulticast.mock.calls.map(([request]) => request);

const notifiedTokens = (): string[] =>
  sent().flatMap((request) => request.tokens);

describe('notifyStaffOnNewTableOrder', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    db = createFakeFirestore();

    db.seed(`restaurants/${RESTAURANT}`, {
      name: 'Owned Bistro',
      ownerUserId: 'owner',
    });
    db.seed(`restaurants/${RESTAURANT}/tables/${TABLE}`, { label: '12' });
    seedInstallation('owner');
    seedStaff('host');
  });

  /**
   * Both lists, because a small restaurant is its own host and a large one has
   * the owner nowhere near the pass. They are the same two reads
   * `requireTableStateAuthority` makes, so who is told about an order is the
   * set who may act on it.
   */
  it('tells the owner and every member of staff', async () => {
    seedStaff('chef');

    await runTrigger();

    expect(notifiedTokens().sort()).toEqual([
      'token-chef',
      'token-host',
      'token-owner',
    ]);
  });

  it('names the table in the copy and in the payload', async () => {
    await runTrigger();

    expect(sent()[0].notification).toEqual({
      title: '🔔 New order',
      body: 'Table 12 just ordered.',
    });
    expect(sent()[0].data).toEqual({
      type: 'NEW_TABLE_ORDER',
      restaurantId: RESTAURANT,
      visitId: VISIT,
      orderId: ORDER,
      tableId: TABLE,
      tableLabel: '12',
    });
  });

  /**
   * A table deleted between the order and this read has no number left, and a
   * generated id in front of a waiter would be worse than leaving it out.
   */
  it('falls back to copy that names no table when the table has gone', async () => {
    await runTrigger({ tableId: 'table-deleted' });

    expect(sent()[0].notification.body).toBe('A table just ordered.');
  });

  /**
   * The surface is the restaurant and the table is the variant, so a second
   * round from one table replaces the first and another table stacks beside it.
   */
  it('collapses per table rather than per restaurant', async () => {
    await runTrigger();

    expect(sent()[0].android?.notification?.tag).toBe(
      `NEW_TABLE_ORDER:${RESTAURANT}:${TABLE}`,
    );
  });

  /**
   * Delivery is a per-installation switch, applied by
   * `sendLocalizedNotification`. This trigger respects the settings by not
   * going round that function - which is what the acceptance criterion asks.
   */
  it('leaves out an installation that has notifications turned off', async () => {
    db.seed(`users/host/pushTokens/token-host`, { enabled: false });

    await runTrigger();

    expect(notifiedTokens()).toEqual(['token-owner']);
  });

  it('does not notify staff of another restaurant', async () => {
    seedStaff('stranger', 'other-restaurant');

    await runTrigger();

    expect(notifiedTokens().sort()).toEqual(['token-host', 'token-owner']);
  });

  it('notifies an owner who is also on the staff list only once', async () => {
    db.seed('restaurantStaff/owner', {
      userId: 'owner',
      restaurantId: RESTAURANT,
    });

    await runTrigger();

    expect(notifiedTokens().sort()).toEqual(['token-host', 'token-owner']);
  });

  it('sends nothing at all when there is nobody to tell', async () => {
    db = createFakeFirestore();
    db.seed(`restaurants/${RESTAURANT}`, { name: 'Owned Bistro' });

    await runTrigger();

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('ignores an event carrying no document', async () => {
    const handler = (
      require('../notify-staff-on-new-table-order') as typeof import('../notify-staff-on-new-table-order')
    ).notifyStaffOnNewTableOrder as unknown as (event: {
      data: undefined;
      params: { restaurantId: string; visitId: string; orderId: string };
    }) => Promise<void>;

    await handler({
      data: undefined,
      params: { restaurantId: RESTAURANT, visitId: VISIT, orderId: ORDER },
    });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });
});
