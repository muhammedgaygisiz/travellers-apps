import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { resetDurableScanRateLimit } from '../../shared/utils/durable-scan-rate-limit';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import { leaveTableSessionHandler } from '../leave-table-session';
import {
  ReadTableVisitBillResult,
  readTableVisitBillHandler,
} from '../read-table-visit-bill';
import { settleTableVisitHandler } from '../settle-table-visit';
import { startTableSessionHandler } from '../start-table-session';
import { submitTableOrderHandler } from '../submit-table-order';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';
import { tableSessionId } from '../table-session';
import { TableVisitBillRead, TableVisitBillRefused } from '../table-visit-bill';
import { transitionTableOrderStatusHandler } from '../transition-table-order-status';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';

/**
 * The party's bill, and staff recording that it was paid
 * (GitHub issue #1110).
 *
 * The emulator rather than a fake Firestore, for the reason the assistance and
 * order specs next door give: every claim here is about a transaction over
 * documents another caller may have moved in between.
 *
 * What is in doubt, and what the blocks below pin down: that the bill is the
 * **party's** and not one phone's, which is the whole point of the callable
 * existing; that identical lines from different guests merge into one row and
 * that lines which only look identical do not; that nothing in the answer says
 * who ordered what; that the four party refusals are the assistance
 * callable's; and that settling is a record a second press does not overwrite.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const HOST = 'host-uid';
const OTHER_HOST = 'other-host-uid';
const ALICE = 'guest-alice';
const BOB = 'guest-bob';

const RESTAURANT = 'owned-restaurant';
const OTHER_RESTAURANT = 'other-restaurant';
const DINING_ROOM = 'dining-room';
const TABLE_12 = 'table-12';
const MENU = 'menu-1';

const TOKEN = 'ABCDEFGHJKMNPQRSTVWXYZ0123';

const MARGHERITA = 'item-margherita';
const TIRAMISU = 'item-tiramisu';

const EUR = 'EUR';

/** Wednesday 2026-09-16, 12:00 in Berlin. The restaurant is open. */
const LUNCHTIME = new Date('2026-09-16T10:00:00Z');

/** Ten minutes later, and still well inside the two-hour idle timeout. */
const LATER = new Date(LUNCHTIME.getTime() + 10 * 60 * 1_000);

/** Three hours later, which is past it. */
const NEXT_DAY = new Date(LUNCHTIME.getTime() + 3 * 60 * 60 * 1_000);

const guestRequest = (data: Record<string, unknown>, uid = ALICE): never =>
  ({
    auth: {
      uid,
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

const readVisit = async (visitId: string): Promise<DocumentData | undefined> =>
  (await restaurantRef().collection('visits').doc(visitId).get()).data();

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
          {
            id: 'category-dolci',
            title: 'Dolci',
            items: [{ id: TIRAMISU, name: 'Tiramisu', price: 6 }],
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

/** A table with a party seated at it, and Alice attached to the visit. */
const seatAlice = async (): Promise<string> => {
  const seating: TransitionTableStateResult = await transitionTableStateHandler(
    staffRequest({
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      status: 'occupied',
      expectedStatus: 'available',
    }),
  );

  await startTableSessionHandler(guestRequest({ token: TOKEN }), LUNCHTIME);

  return seating.visitId ?? '';
};

/** Bob joins the party Alice is already at. */
const joinBob = async (): Promise<void> => {
  await startTableSessionHandler(
    guestRequest({ token: TOKEN }, BOB),
    LUNCHTIME,
  );
};

interface OrderedLine {
  menuItemId: string;
  quantity: number;
  price: number;
  notes?: string;
}

const order = async (
  lines: OrderedLine[],
  uid = ALICE,
  now: Date = LUNCHTIME,
): Promise<string> => {
  const result = (await submitTableOrderHandler(
    guestRequest(
      {
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        currency: EUR,
        lines,
      },
      uid,
    ),
    now,
  )) as { order?: { id?: string } };

  return result.order?.id ?? '';
};

const readBill = (
  uid = ALICE,
  now: Date = LUNCHTIME,
): Promise<ReadTableVisitBillResult> =>
  readTableVisitBillHandler(
    guestRequest({ restaurantId: RESTAURANT, tableId: TABLE_12 }, uid),
    now,
  );

const billOf = (result: ReadTableVisitBillResult): TableVisitBillRead['bill'] =>
  (result as TableVisitBillRead).bill;

const reasonOf = (result: ReadTableVisitBillResult): string =>
  (result as TableVisitBillRefused).reason;

describe('the visit bill', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error('bill emulator specs require the Firestore emulator.');
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    resetScanRateLimit();
    await resetDurableScanRateLimit();
    await clear();
    await seed();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  describe('what the party owes', () => {
    /**
     * The claim the callable exists for. `RD-TS-12` gives a guest their own
     * orders, so Alice reading Bob's dessert on her own screen is the thing
     * that cannot be done with a Firestore query and is the whole reason this
     * is a callable.
     */
    it('sums every guest at the table, not just the caller', async () => {
      await seatAlice();
      await joinBob();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }], ALICE);
      await order([{ menuItemId: TIRAMISU, quantity: 1, price: 6 }], BOB);

      const bill = billOf(await readBill(ALICE));

      expect(bill.total).toBe(18);
      expect(bill.orderCount).toBe(2);
      expect(bill.lines).toHaveLength(2);
    });

    it('answers Bob with the same bill it answers Alice with', async () => {
      await seatAlice();
      await joinBob();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }], ALICE);
      await order([{ menuItemId: TIRAMISU, quantity: 1, price: 6 }], BOB);

      expect(billOf(await readBill(BOB))).toEqual(
        billOf(await readBill(ALICE)),
      );
    });

    /**
     * `RD-TS-47`. The merge is what removes the grouping an unmerged bill
     * would leak: two guests who ordered the same dish are one row, so a party
     * cannot read off who had what by elimination.
     */
    it('merges the same dish ordered by two different guests', async () => {
      await seatAlice();
      await joinBob();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }], ALICE);
      await order([{ menuItemId: MARGHERITA, quantity: 2, price: 12 }], BOB);

      const bill = billOf(await readBill());

      expect(bill.lines).toHaveLength(1);
      expect(bill.lines[0]).toMatchObject({
        menuItemId: MARGHERITA,
        quantity: 3,
        unitPrice: 12,
        lineTotal: 36,
      });
      expect(bill.total).toBe(36);
    });

    /** A note makes it a different dish to the kitchen and to the guest. */
    it('keeps two rows where the guests asked for different things', async () => {
      await seatAlice();
      await joinBob();
      await order(
        [{ menuItemId: MARGHERITA, quantity: 1, price: 12, notes: 'no basil' }],
        ALICE,
      );
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }], BOB);

      const bill = billOf(await readBill());

      expect(bill.lines).toHaveLength(2);
      expect(bill.total).toBe(24);
    });

    /**
     * Nothing in the answer names a guest. This is asserted over the whole
     * serialized payload rather than field by field, because the risk is a
     * field somebody adds later rather than one that is there now.
     */
    it('names nobody anywhere in the bill', async () => {
      await seatAlice();
      await joinBob();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }], ALICE);
      await order([{ menuItemId: TIRAMISU, quantity: 1, price: 6 }], BOB);

      const serialized = JSON.stringify(billOf(await readBill()));

      expect(serialized).not.toContain(ALICE);
      expect(serialized).not.toContain(BOB);
      expect(serialized).not.toContain('guestUserId');
    });

    /** A dish the kitchen will not cook will not be billed. */
    it('drops a cancelled order from the lines and the total', async () => {
      const visitId = await seatAlice();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }]);
      const cancelled = await order([
        { menuItemId: TIRAMISU, quantity: 1, price: 6 },
      ]);

      await transitionTableOrderStatusHandler(
        staffRequest({
          restaurantId: RESTAURANT,
          visitId,
          orderId: cancelled,
          status: 'cancelled',
          expectedStatus: 'submitted',
          reason: 'Out of mascarpone.',
        }),
      );

      const bill = billOf(await readBill());

      expect(bill.total).toBe(12);
      expect(bill.orderCount).toBe(1);
      expect(bill.lines).toHaveLength(1);
    });

    /**
     * A party that has ordered nothing gets an empty bill rather than a
     * refusal: they are sitting at the table, and "you owe nothing yet" is an
     * answer.
     */
    it('answers a seated party that has ordered nothing', async () => {
      await seatAlice();

      const bill = billOf(await readBill());

      expect(bill.total).toBe(0);
      expect(bill.lines).toEqual([]);
      expect(bill.orderCount).toBe(0);
    });

    it('carries the currency the orders were taken in', async () => {
      await seatAlice();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }]);

      expect(billOf(await readBill()).currency).toBe(EUR);
    });

    it('opens unsettled, because nothing has recorded a payment', async () => {
      await seatAlice();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }]);

      expect(billOf(await readBill()).paymentStatus).toBe('unsettled');
    });
  });

  describe('who may read it', () => {
    it('refuses a phone with no session at that table', async () => {
      await seatAlice();

      expect(reasonOf(await readBill('guest-nobody'))).toBe('sessionNotFound');
    });

    /** A guest waiting to be seated owes nothing and has no visit to read. */
    it('refuses a pending session', async () => {
      await startTableSessionHandler(guestRequest({ token: TOKEN }), LUNCHTIME);

      expect(reasonOf(await readBill())).toBe('sessionNotActive');
    });

    it('refuses a guest who left', async () => {
      await seatAlice();
      await leaveTableSessionHandler(
        guestRequest({ restaurantId: RESTAURANT, tableId: TABLE_12 }),
        LUNCHTIME,
      );

      expect(reasonOf(await readBill())).toBe('sessionNotActive');
    });

    /** And persists the expiry, like every other caller that observes one. */
    it('refuses an idle session and writes the expiry down', async () => {
      await seatAlice();

      expect(reasonOf(await readBill(ALICE, NEXT_DAY))).toBe('sessionExpired');

      const session = await restaurantRef()
        .collection('tableSessions')
        .doc(tableSessionId(TABLE_12, ALICE))
        .get();

      expect(session.data()?.['status']).toBe('expired');
    });

    /**
     * The live bill stops at the moment the visit ends. What a guest sees
     * afterwards is the retained summary of issue #1111, which is a different
     * document with a different retention rule.
     *
     * The reason is `sessionNotActive` rather than `visitClosed`, and that is
     * the system rather than a looser assertion: ending a visit closes every
     * session under it **in the same commit**, so the session guard answers
     * before the visit is ever read. `visitClosed` is the defensive branch for
     * an active session pointing at an ended visit - a state the atomic close
     * is what prevents - and `requestTableAssistance` carries the same branch
     * for the same reason. The guest is told their table was closed either
     * way, which is the sentence that matters at the table.
     */
    it('refuses once staff have closed the visit', async () => {
      await seatAlice();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }]);
      // `ordering` and not `occupied`: the order moved the table in the commit
      // that stored it (`RD-TS-11`), so that is the status the close contends
      // against.
      await transitionTableStateHandler(
        staffRequest({
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          status: 'cleaning',
          expectedStatus: 'ordering',
          // The party ordered and nobody recorded a payment, so the close asks
          // (issue #1111). What is being tested here is the bill after a
          // close, not the confirmation, so this one is given.
          acknowledgeUnsettled: true,
        }),
      );

      expect(reasonOf(await readBill())).toBe('sessionNotActive');
    });
  });

  describe('recording that the party paid', () => {
    it('writes the method, the moment and who recorded it', async () => {
      const visitId = await seatAlice();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }]);

      const result = await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'card' }),
        LATER,
      );

      expect(result).toMatchObject({ ok: true, method: 'card', changed: true });
      expect(await readVisit(visitId)).toMatchObject({
        paymentStatus: 'settled',
        settlementMethod: 'card',
        settledAt: LATER.getTime(),
        settledByUserId: HOST,
      });
    });

    /** The guest's own screen is how a party learns the table is square. */
    it('shows on the bill the guest reads next', async () => {
      const visitId = await seatAlice();
      await order([{ menuItemId: MARGHERITA, quantity: 1, price: 12 }]);
      await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'cash' }),
        LATER,
      );

      const bill = billOf(await readBill());

      expect(bill.paymentStatus).toBe('settled');
      expect(bill.settlementMethod).toBe('cash');
    });

    /**
     * `RD-TS-22`'s shape rather than `transitionTableOrderStatus`'s: there is
     * one destination, so two members of staff pressing it both wanted what
     * happened. What it must not do is move `settledAt` to a later instant
     * that describes nothing.
     */
    it('answers a second press with the first one and writes nothing', async () => {
      const visitId = await seatAlice();
      await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'cash' }),
        LATER,
      );

      const second = await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'card' }),
        NEXT_DAY,
      );

      expect(second).toMatchObject({
        changed: false,
        method: 'cash',
        settledAt: LATER.getTime(),
      });
      expect(await readVisit(visitId)).toMatchObject({
        settlementMethod: 'cash',
        settledAt: LATER.getTime(),
      });
    });

    /**
     * Settling does not clear the table. A bill paid while the party is still
     * on their coffee is ordinary, and a callable that freed the table would
     * seat the next party on top of them.
     */
    it('leaves the table and the visit exactly where they were', async () => {
      const visitId = await seatAlice();
      await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'card' }),
        LATER,
      );

      const state = await restaurantRef()
        .collection('tableStates')
        .doc(TABLE_12)
        .get();

      expect(state.data()?.['status']).toBe('occupied');
      expect((await readVisit(visitId))?.['status']).toBe('open');
    });

    /**
     * A party that walked out and came back the next morning to pay is a real
     * evening, and refusing the record would leave the visit saying the
     * restaurant was never paid.
     */
    it('records a payment against a visit that has already closed', async () => {
      const visitId = await seatAlice();
      await transitionTableStateHandler(
        staffRequest({
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          status: 'cleaning',
          expectedStatus: 'occupied',
        }),
      );

      const result = await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'other' }),
        NEXT_DAY,
      );

      expect(result).toMatchObject({ changed: true, method: 'other' });
    });

    it('refuses a guest', async () => {
      const visitId = await seatAlice();

      expect(
        await codeOf(
          settleTableVisitHandler(
            guestRequest({ restaurantId: RESTAURANT, visitId, method: 'cash' }),
          ),
        ),
      ).toBe('permission-denied');
    });

    /** The same guard that seats a table: one permission for the floor. */
    it('refuses staff of another restaurant', async () => {
      const visitId = await seatAlice();

      expect(
        await codeOf(
          settleTableVisitHandler(
            staffRequest(
              { restaurantId: RESTAURANT, visitId, method: 'cash' },
              OTHER_HOST,
            ),
          ),
        ),
      ).toBe('permission-denied');
    });

    it('refuses a method that is not one of the three', async () => {
      const visitId = await seatAlice();

      expect(
        await codeOf(
          settleTableVisitHandler(
            staffRequest({
              restaurantId: RESTAURANT,
              visitId,
              method: 'crypto',
            }),
          ),
        ),
      ).toBe('invalid-argument');
    });

    it('refuses a visit that does not exist', async () => {
      await seatAlice();

      expect(
        await codeOf(
          settleTableVisitHandler(
            staffRequest({
              restaurantId: RESTAURANT,
              visitId: 'no-such-visit',
              method: 'cash',
            }),
          ),
        ),
      ).toBe('not-found');
    });
  });
});
