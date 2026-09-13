import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import { startTableSessionHandler } from '../start-table-session';
import {
  SubmitTableOrderResult,
  TableOrderSubmitted,
  submitTableOrderHandler,
} from '../submit-table-order';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';
import {
  TransitionTableOrderResult,
  transitionTableOrderStatusHandler,
} from '../transition-table-order-status';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';

/**
 * The staff queue moving an order along, against the real database
 * (GitHub issue #1105).
 *
 * The emulator rather than a fake Firestore, for the reason the submission spec
 * next door gives: the claims here are about a transaction over a document that
 * another caller may have moved in between, and a mocked store would assert
 * that the code called `update` - which was never the part in doubt.
 *
 * What is in doubt, and what each block below pins down: that an order moves
 * only along the matrix, that the second of two people pressing a button is
 * told rather than silently overwriting the first, that a cancellation carries
 * the sentence a guest is shown, and that nothing else on the order can be
 * changed through this door.
 *
 * The read half of the queue - a collection-group query scoped to one
 * restaurant - is a rules question and lives in `src/firestore-rules/__specs__`.
 * The Admin SDK bypasses rules, so it cannot be checked from here.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const HOST = 'host-uid';
const OTHER_HOST = 'other-host-uid';
const ALICE = 'guest-alice';

const RESTAURANT = 'owned-restaurant';
const OTHER_RESTAURANT = 'other-restaurant';
const DINING_ROOM = 'dining-room';
const TABLE_12 = 'table-12';
const MENU = 'menu-1';

const TOKEN = 'ABCDEFGHJKMNPQRSTVWXYZ0123';

const MARGHERITA = 'item-margherita';

const EUR = 'EUR';

/** Wednesday 2026-09-16, 12:00 in Berlin. The restaurant is open. */
const LUNCHTIME = new Date('2026-09-16T10:00:00Z');

const guestRequest = (data: Record<string, unknown>): never =>
  ({
    auth: {
      uid: ALICE,
      token: { firebase: { sign_in_provider: 'anonymous' } },
    },
    data,
    rawRequest: { ip: '203.0.113.7' },
  }) as never;

const staffRequest = (
  data: Record<string, unknown>,
  uid = HOST,
  roles: string[] = ['staff'],
): never => ({ auth: { uid, token: { roles } }, data }) as never;

const restaurantRef = (id = RESTAURANT): DocumentReference =>
  getFirestore().collection('restaurants').doc(id);

const orderRef = (visitId: string, orderId: string): DocumentReference =>
  restaurantRef()
    .collection('visits')
    .doc(visitId)
    .collection('orders')
    .doc(orderId);

const readOrder = async (
  visitId: string,
  orderId: string,
): Promise<DocumentData | undefined> =>
  (await orderRef(visitId, orderId).get()).data();

/** The error code an `HttpsError` carries, or the error itself if it is not one. */
const codeOf = async (call: Promise<unknown>): Promise<string> => {
  try {
    await call;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }

  return 'no error';
};

const table = (label: string): Record<string, unknown> => ({
  label,
  roomId: DINING_ROOM,
  position: { x: 2000, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
});

const seed = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    restaurantRef().set({
      name: 'Owned Bistro',
      ownerUserId: OWNER,
      claimStatus: 'claimed',
      menuId: MENU,
      openingHours: [
        {
          day: 'wednesday',
          isOpen: true,
          timeRanges: [{ from: '11:30', to: '23:00' }],
        },
      ],
      tableOrdering: { enabled: true, timeZone: 'Europe/Berlin' },
    }),
    restaurantRef(OTHER_RESTAURANT).set({
      name: 'Somebody Else',
      ownerUserId: 'other-business-uid',
      claimStatus: 'claimed',
    }),
  ]);

  await Promise.all([
    restaurantRef().collection('tables').doc(TABLE_12).set(table('12')),
    restaurantRef()
      .collection('rooms')
      .doc(DINING_ROOM)
      .set({ id: DINING_ROOM, name: 'Main dining room', order: 0 }),
    db
      .collection('menus')
      .doc(MENU)
      .set({
        id: MENU,
        restaurantId: RESTAURANT,
        currency: EUR,
        categories: [
          {
            id: 'category-pizza',
            title: 'Pizza',
            items: [{ id: MARGHERITA, name: 'Margherita', price: 12 }],
          },
        ],
      }),
    db
      .collection(TABLE_TOKENS_COLLECTION)
      .doc(TOKEN)
      .set({
        restaurantId: RESTAURANT,
        roomId: DINING_ROOM,
        tableId: TABLE_12,
        tableLabel: '12',
        tableEnabled: true,
        status: 'active',
        issuedAt: '2026-09-01T09:00:00.000Z',
        issuedAtTimestamp: Date.parse('2026-09-01T09:00:00.000Z'),
      }),
    db
      .collection('restaurantStaff')
      .doc(HOST)
      .set({ userId: HOST, restaurantId: RESTAURANT }),
    db
      .collection('restaurantStaff')
      .doc(OTHER_HOST)
      .set({ userId: OTHER_HOST, restaurantId: OTHER_RESTAURANT }),
  ]);
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection('restaurantStaff')),
    db.recursiveDelete(db.collection('menus')),
    db.recursiveDelete(db.collection(TABLE_TOKENS_COLLECTION)),
  ]);
};

/** A seated table with one submitted order on its visit. */
const placeOrder = async (): Promise<TableOrderSubmitted> => {
  const seating: TransitionTableStateResult = await transitionTableStateHandler(
    staffRequest({
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      status: 'occupied',
      expectedStatus: 'available',
    }),
  );

  await startTableSessionHandler(guestRequest({ token: TOKEN }), LUNCHTIME);

  const result: SubmitTableOrderResult = await submitTableOrderHandler(
    guestRequest({
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      currency: EUR,
      lines: [{ menuItemId: MARGHERITA, quantity: 1, price: 12 }],
    }),
    LUNCHTIME,
  );

  expect(seating.visitId).toBeTruthy();

  return result as TableOrderSubmitted;
};

/** A second round from the same phone, into the visit that is already open. */
const submitAgain = async (): Promise<TableOrderSubmitted> =>
  (await submitTableOrderHandler(
    guestRequest({
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      currency: EUR,
      lines: [{ menuItemId: MARGHERITA, quantity: 2, price: 12 }],
    }),
    LUNCHTIME,
  )) as TableOrderSubmitted;

const move = (
  order: TableOrderSubmitted,
  status: string,
  expectedStatus: string,
  extra: Record<string, unknown> = {},
  uid = HOST,
  roles: string[] = ['staff'],
): Promise<TransitionTableOrderResult> =>
  transitionTableOrderStatusHandler(
    staffRequest(
      {
        restaurantId: RESTAURANT,
        visitId: order.order.visitId,
        orderId: order.order.id,
        status,
        expectedStatus,
        ...extra,
      },
      uid,
      roles,
    ),
  );

describe('incoming order queue for staff', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table order queue emulator specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    resetScanRateLimit();
    await clear();
    await seed();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  describe('moving an order along', () => {
    it('accepts a submitted order and records who did it and when', async () => {
      const order = await placeOrder();

      const result = await move(order, 'accepted', 'submitted');
      const stored = await readOrder(order.order.visitId, order.order.id);

      expect(result).toMatchObject({
        from: 'submitted',
        to: 'accepted',
        orderId: order.order.id,
      });
      expect(stored).toMatchObject({
        status: 'accepted',
        statusChangedByUserId: HOST,
      });
      expect(stored?.['statusChangedAt']).toBe(result.statusChangedAt);
    });

    /**
     * `submittedAt` is when the guest sent it and never moves, which is what
     * the queue sorts and ages rows by. A transition that touched it would
     * reset the "waiting 14 minutes" every time somebody pressed a button -
     * which is the one number the queue exists to show.
     */
    it('leaves the lines, the total and the submission time alone', async () => {
      const order = await placeOrder();

      await move(order, 'accepted', 'submitted');

      const stored = await readOrder(order.order.visitId, order.order.id);

      expect(stored?.['lines']).toEqual(order.order.lines);
      expect(stored?.['total']).toBe(order.order.total);
      expect(stored?.['submittedAt']).toBe(order.order.submittedAt);
      expect(stored?.['guestUserId']).toBe(ALICE);
    });

    /**
     * `preparing` is skippable by the matrix, so a kitchen that plates a
     * dessert as it is ordered is not made to tap through a status it does not
     * have.
     */
    it('walks the whole lifecycle, and lets preparing be skipped', async () => {
      const order = await placeOrder();

      await move(order, 'accepted', 'submitted');
      await move(order, 'preparing', 'accepted');
      await move(order, 'served', 'preparing');

      expect(
        (await readOrder(order.order.visitId, order.order.id))?.['status'],
      ).toBe('served');

      // A second round into the same visit, so the skip is exercised on a
      // fresh order rather than by seating the table a second time.
      const second = await submitAgain();

      await move(second, 'accepted', 'submitted');
      await move(second, 'served', 'accepted');

      expect(
        (await readOrder(second.order.visitId, second.order.id))?.['status'],
      ).toBe('served');
    });

    it('refuses a move the matrix does not contain', async () => {
      const order = await placeOrder();

      expect(await codeOf(move(order, 'preparing', 'submitted'))).toBe(
        'failed-precondition',
      );
    });

    /**
     * Nothing leaves an end status. A served dish cancelled an hour later is a
     * change to a bill dressed up as a status change.
     */
    it('refuses anything at all once the order has ended', async () => {
      const order = await placeOrder();

      await move(order, 'accepted', 'submitted');
      await move(order, 'served', 'accepted');

      expect(
        await codeOf(
          move(order, 'cancelled', 'served', { reason: 'sent back' }),
        ),
      ).toBe('failed-precondition');
    });
  });

  describe('two people working one queue', () => {
    /**
     * The whole reason the request carries `expectedStatus`. A waiter presses
     * Served while the kitchen presses Cancelled; exactly one commits, and the
     * loser is told what the order holds now instead of overwriting it.
     */
    it('lets the first press win and tells the second what happened', async () => {
      const order = await placeOrder();

      await move(order, 'accepted', 'submitted');

      expect(
        await codeOf(
          move(order, 'cancelled', 'submitted', { reason: 'sold out' }),
        ),
      ).toBe('aborted');
      expect(
        (await readOrder(order.order.visitId, order.order.id))?.['status'],
      ).toBe('accepted');
    });
  });

  describe('cancelling', () => {
    it('stores the reason the guest is shown', async () => {
      const order = await placeOrder();

      await move(order, 'cancelled', 'submitted', {
        reason: 'The kitchen has run out of sea bass.',
      });

      expect(
        await readOrder(order.order.visitId, order.order.id),
      ).toMatchObject({
        status: 'cancelled',
        cancellationReason: 'The kitchen has run out of sea bass.',
      });
    });

    /**
     * "Cancellations are explained, not silent" is an acceptance criterion of
     * this issue, so the backend refuses rather than recording a cancellation
     * the guest's screen has nothing to say about.
     */
    it('refuses a cancellation with no reason, or only spaces', async () => {
      const order = await placeOrder();

      expect(await codeOf(move(order, 'cancelled', 'submitted'))).toBe(
        'invalid-argument',
      );
      expect(
        await codeOf(move(order, 'cancelled', 'submitted', { reason: '   ' })),
      ).toBe('invalid-argument');
      expect(
        (await readOrder(order.order.visitId, order.order.id))?.['status'],
      ).toBe('submitted');
    });

    it('refuses a reason longer than the model allows', async () => {
      const order = await placeOrder();

      expect(
        await codeOf(
          move(order, 'cancelled', 'submitted', { reason: 'x'.repeat(201) }),
        ),
      ).toBe('invalid-argument');
    });

    /**
     * A reason on a served dish would be a second, contradictory account of
     * what happened to it - and it would sit on the guest's screen for good.
     */
    it('refuses a reason on any status but cancelled', async () => {
      const order = await placeOrder();

      expect(
        await codeOf(
          move(order, 'accepted', 'submitted', { reason: 'looks good' }),
        ),
      ).toBe('invalid-argument');
    });
  });

  describe('who may work the pass', () => {
    it('admits the account the restaurant is assigned to', async () => {
      const order = await placeOrder();

      await move(order, 'accepted', 'submitted', {}, OWNER, ['business']);

      expect(
        (await readOrder(order.order.visitId, order.order.id))?.[
          'statusChangedByUserId'
        ],
      ).toBe(OWNER);
    });

    /**
     * The `staff` role alone is not a key to every dining room in BiteTribe.
     * The association has to name *this* restaurant, which is the pair
     * `worksAt()` checks in the rules.
     */
    it('refuses staff of another restaurant', async () => {
      const order = await placeOrder();

      expect(
        await codeOf(move(order, 'accepted', 'submitted', {}, OTHER_HOST)),
      ).toBe('permission-denied');
    });

    it('refuses the guest who placed the order', async () => {
      const order = await placeOrder();

      expect(
        await codeOf(
          transitionTableOrderStatusHandler(
            guestRequest({
              restaurantId: RESTAURANT,
              visitId: order.order.visitId,
              orderId: order.order.id,
              status: 'served',
              expectedStatus: 'submitted',
            }),
          ),
        ),
      ).toBe('permission-denied');
    });
  });

  describe('arguments', () => {
    it('refuses an order that is not there', async () => {
      const order = await placeOrder();

      expect(
        await codeOf(
          transitionTableOrderStatusHandler(
            staffRequest({
              restaurantId: RESTAURANT,
              visitId: order.order.visitId,
              orderId: 'no-such-order',
              status: 'accepted',
              expectedStatus: 'submitted',
            }),
          ),
        ),
      ).toBe('not-found');
    });

    it('refuses a status this version does not know', async () => {
      const order = await placeOrder();

      expect(await codeOf(move(order, 'plated', 'submitted'))).toBe(
        'invalid-argument',
      );
    });

    it('refuses a request missing the visit it belongs to', async () => {
      const order = await placeOrder();

      expect(
        await codeOf(
          transitionTableOrderStatusHandler(
            staffRequest({
              restaurantId: RESTAURANT,
              orderId: order.order.id,
              status: 'accepted',
              expectedStatus: 'submitted',
            }),
          ),
        ),
      ).toBe('invalid-argument');
    });
  });
});
