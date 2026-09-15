import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { resetDurableScanRateLimit } from '../../shared/utils/durable-scan-rate-limit';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import { startTableSessionHandler } from '../start-table-session';
import {
  SubmitTableOrderResult,
  TableOrderSubmitted,
  submitTableOrderHandler,
} from '../submit-table-order';
import { TableOrderRefused } from '../table-order';
import { tableSessionId } from '../table-session';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';
import { moveTableVisitHandler } from '../move-table-visit';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';

/**
 * The table cart reaching the kitchen, against the real database
 * (GitHub issue #1103).
 *
 * The emulator rather than a fake Firestore, for the reason the session specs
 * next door give: every claim this issue makes is about several documents
 * agreeing. An order under the visit and not the table, a table status moved in
 * the commit that wrote the order, a price on a line that matches a menu
 * document nobody edited in between. A mocked store would assert that the code
 * called `create`, which was never the part in doubt.
 *
 * The rules half - that no client writes an order and a guest reads only their
 * own - is in `src/firestore-rules/__specs__`. The Admin SDK bypasses rules, so
 * it cannot be checked from here.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const HOST = 'host-uid';

const ALICE = 'guest-alice';
const BOB = 'guest-bob';

const RESTAURANT = 'owned-restaurant';
const DINING_ROOM = 'dining-room';
const TABLE_12 = 'table-12';
const TABLE_5 = 'table-5';
const MENU = 'menu-1';

const TOKEN = 'ABCDEFGHJKMNPQRSTVWXYZ0123';

const MARGHERITA = 'item-margherita';
const MARGHERITA_LARGE = 'variant-margherita-large';
const TIRAMISU = 'item-tiramisu';

const EUR = 'EUR';

/** Wednesday 2026-09-16, 12:00 in Berlin. The restaurant is open. */
const LUNCHTIME = new Date('2026-09-16T10:00:00Z');

const MINUTE = 60 * 1000;

const later = (minutes: number): Date =>
  new Date(LUNCHTIME.getTime() + minutes * MINUTE);

interface Guest {
  uid: string;
}

const alice: Guest = { uid: ALICE };
const bob: Guest = { uid: BOB };

const guestRequest = (guest: Guest, data: Record<string, unknown>): never =>
  ({
    auth: {
      uid: guest.uid,
      token: { firebase: { sign_in_provider: 'anonymous' } },
    },
    data,
    rawRequest: { ip: '203.0.113.7' },
  }) as never;

const staffRequest = (data: Record<string, unknown>): never =>
  ({ auth: { uid: HOST, token: { roles: ['staff'] } }, data }) as never;

const start = (guest: Guest = alice, now = LUNCHTIME): Promise<unknown> =>
  startTableSessionHandler(guestRequest(guest, { token: TOKEN }), now);

/** One ordinary line: a plain Margherita at the price the menu states. */
const margherita = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  menuItemId: MARGHERITA,
  quantity: 1,
  price: 12,
  ...overrides,
});

const submit = (
  lines: Record<string, unknown>[] = [margherita()],
  guest: Guest = alice,
  now = LUNCHTIME,
  extra: Record<string, unknown> = {},
): Promise<SubmitTableOrderResult> =>
  submitTableOrderHandler(
    guestRequest(guest, {
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      currency: EUR,
      lines,
      ...extra,
    }),
    now,
  );

const submitted = async (
  lines: Record<string, unknown>[] = [margherita()],
  guest: Guest = alice,
  now = LUNCHTIME,
): Promise<TableOrderSubmitted> =>
  (await submit(lines, guest, now)) as TableOrderSubmitted;

const refused = async (
  lines: Record<string, unknown>[] = [margherita()],
  guest: Guest = alice,
  now = LUNCHTIME,
  extra: Record<string, unknown> = {},
): Promise<TableOrderRefused> =>
  (await submit(lines, guest, now, extra)) as TableOrderRefused;

const transition = (
  tableId: string,
  to: string,
  from: string,
): Promise<TransitionTableStateResult> =>
  transitionTableStateHandler(
    staffRequest({
      restaurantId: RESTAURANT,
      tableId,
      status: to,
      expectedStatus: from,
    }),
  );

/** The ordinary seating: a free table takes a party, opening a visit. */
const seat = (tableId = TABLE_12): Promise<TransitionTableStateResult> =>
  transition(tableId, 'occupied', 'available');

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

const readState = async (
  tableId = TABLE_12,
): Promise<DocumentData | undefined> =>
  (await restaurantRef().collection('tableStates').doc(tableId).get()).data();

const readTransitions = async (): Promise<DocumentData[]> =>
  (await restaurantRef().collection('tableStateTransitions').get()).docs
    .map((entry) => entry.data())
    .sort((left, right) => Number(left['at']) - Number(right['at']));

const readOrders = async (visitId: string): Promise<DocumentData[]> =>
  (
    await restaurantRef()
      .collection('visits')
      .doc(visitId)
      .collection('orders')
      .get()
  ).docs.map((order) => order.data());

const readSession = async (
  guest: Guest = alice,
  tableId = TABLE_12,
): Promise<DocumentData | undefined> =>
  (
    await restaurantRef()
      .collection('tableSessions')
      .doc(tableSessionId(tableId, guest.uid))
      .get()
  ).data();

/** Rewrites the stored menu, so a mid-meal edit is an ordinary document write. */
const setMenu = (categories: unknown[]): Promise<unknown> =>
  getFirestore().collection('menus').doc(MENU).update({ categories });

const menuCategories = (): Record<string, unknown>[] => [
  {
    id: 'category-pizza',
    title: 'Pizza',
    items: [
      {
        id: MARGHERITA,
        name: 'Margherita',
        description: 'Tomato and mozzarella',
        price: 12,
        variants: [{ id: MARGHERITA_LARGE, name: 'Large', price: 16 }],
      },
    ],
  },
  {
    id: 'category-dessert',
    title: 'Dessert',
    items: [{ id: TIRAMISU, name: 'Tiramisu', price: 6 }],
  },
];

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

  await restaurantRef().set({
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
  });

  await Promise.all([
    restaurantRef().collection('tables').doc(TABLE_12).set(table('12')),
    restaurantRef().collection('tables').doc(TABLE_5).set(table('5')),
    restaurantRef()
      .collection('rooms')
      .doc(DINING_ROOM)
      .set({ id: DINING_ROOM, name: 'Main dining room', order: 0 }),
    db.collection('menus').doc(MENU).set({
      id: MENU,
      restaurantId: RESTAURANT,
      currency: EUR,
      categories: menuCategories(),
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

/** A seated table with Alice active on its visit: the state every order needs. */
const ordering = async (): Promise<string> => {
  const seating = await seat();
  await start(alice);

  return seating.visitId ?? '';
};

describe('table cart and order submission', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table order emulator specs require the Firestore emulator.',
      );
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

  describe('an ordinary order', () => {
    it('stores the order under the visit, not under the table', async () => {
      const visitId = await ordering();
      const result = await submitted();

      expect(result.order.visitId).toBe(visitId);
      expect(await readOrders(visitId)).toHaveLength(1);
    });

    /**
     * The line is a copy of the menu and not a pointer at it, which is the
     * whole of issue #1099 being a prerequisite: the name and the price are on
     * the line, and the id is there as well for the questions the copy cannot
     * answer.
     */
    it('copies the name, the price and the currency onto the line', async () => {
      await ordering();

      const { order } = await submitted([
        margherita({ quantity: 2, notes: ' no basil ' }),
      ]);

      expect(order.lines).toEqual([
        {
          menuItemId: MARGHERITA,
          name: 'Margherita',
          price: 12,
          currency: EUR,
          quantity: 2,
          notes: 'no basil',
        },
      ]);
      expect(order.total).toBe(24);
    });

    it('records the variant a guest chose, priced at the variant', async () => {
      await ordering();

      const { order } = await submitted([
        margherita({ variantId: MARGHERITA_LARGE, price: 16 }),
      ]);

      expect(order.lines[0]).toMatchObject({
        menuItemId: MARGHERITA,
        name: 'Margherita',
        variantId: MARGHERITA_LARGE,
        variantName: 'Large',
        price: 16,
      });
    });

    it('totals every line', async () => {
      await ordering();

      const { order } = await submitted([
        margherita({ quantity: 2 }),
        { menuItemId: TIRAMISU, quantity: 3, price: 6 },
      ]);

      expect(order.total).toBe(24 + 18);
    });

    it('starts the order submitted, with the session and guest on it', async () => {
      await ordering();

      const { order } = await submitted();

      expect(order).toMatchObject({
        status: 'submitted',
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        guestUserId: ALICE,
        sessionId: tableSessionId(TABLE_12, ALICE),
        currency: EUR,
      });
      expect(order.statusChangedAt).toBe(order.submittedAt);
    });

    it('drops an empty note rather than storing one', async () => {
      await ordering();

      const { order } = await submitted([margherita({ notes: '   ' })]);

      expect(order.lines[0].notes).toBeUndefined();
    });

    /**
     * A party three hours into a long dinner that is still ordering has not
     * gone idle, so ordering pushes the clock the timeout is measured from.
     */
    it('counts ordering as activity on the session', async () => {
      await ordering();
      await submitted([margherita()], alice, later(30));

      expect((await readSession())?.['lastActiveAt']).toBe(later(30).getTime());
    });
  });

  describe('the table state it leaves behind', () => {
    /**
     * The acceptance criterion, and the reason this is not the stage 2
     * callable: a guest holds no staff authority, so the transition is written
     * here, in the commit that wrote the order.
     */
    it('advances a seated table to ordering', async () => {
      await ordering();
      const result = await submitted();

      expect(result.tableStatus).toBe('ordering');
      expect((await readState())?.['status']).toBe('ordering');
    });

    it('appends an audit entry naming the guest who moved it', async () => {
      const visitId = await ordering();
      await submitted();

      const entries = await readTransitions();

      expect(entries.at(-1)).toMatchObject({
        tableId: TABLE_12,
        from: 'occupied',
        to: 'ordering',
        actorUserId: ALICE,
        actorRoles: [],
        visitId,
      });
    });

    /**
     * A second round is not a conflict. Refusing `ordering -> ordering` would
     * refuse every order after the first, which is most of a dinner.
     */
    it('leaves a table that is already ordering alone', async () => {
      await ordering();
      await submitted();
      const before = (await readState())?.['since'];

      const second = await submitted([margherita()], alice, later(20));

      expect(second.tableStatus).toBe('ordering');
      expect((await readState())?.['since']).toBe(before);
      expect(await readTransitions()).toHaveLength(2);
    });

    /**
     * Turning the table over ends the visit, and the same commit closes the
     * sessions on it (issue #1101) - so the guest is told their session is over
     * rather than anything about the table. That is the better sentence: "your
     * table was closed" is what `closed` means, and the floor's status is a
     * fact about the restaurant rather than about them.
     */
    it('refuses an order at a table that has been turned over', async () => {
      await ordering();
      await transition(TABLE_12, 'cleaning', 'occupied');

      expect((await refused()).reason).toBe('sessionNotActive');
    });
  });

  describe('a party that moved tables', () => {
    /**
     * The acceptance criterion the storage shape exists for. The session still
     * names the table the guest scanned; the order and the status advance
     * follow the *visit*, which is the identity that survives a move.
     */
    it('orders against the table the visit is at now', async () => {
      const visitId = await ordering();

      await moveTableVisitHandler(
        staffRequest({
          restaurantId: RESTAURANT,
          visitId,
          toTableId: TABLE_5,
          expectedStatus: 'available',
        }),
      );

      const { order, tableStatus } = await submitted();

      expect(order.tableId).toBe(TABLE_5);
      expect(order.visitId).toBe(visitId);
      expect(tableStatus).toBe('ordering');
      expect((await readState(TABLE_5))?.['status']).toBe('ordering');
    });
  });

  describe('prices the guest did not see', () => {
    /**
     * The first acceptance criterion. The owner raises a price while the guest
     * is reading the description, and neither the old number nor the new one is
     * quietly recorded: the order is refused and the guest re-reads the line.
     */
    it('refuses an order whose price moved, naming both prices', async () => {
      await ordering();
      await setMenu([
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [{ id: MARGHERITA, name: 'Margherita', price: 14 }],
        },
      ]);

      expect(await refused()).toEqual({
        ok: false,
        reason: 'priceChanged',
        item: {
          menuItemId: MARGHERITA,
          name: 'Margherita',
          shownPrice: 12,
          currentPrice: 14,
        },
      });
    });

    it('writes nothing at all when a line is refused', async () => {
      const visitId = await ordering();
      await setMenu([
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [{ id: MARGHERITA, name: 'Margherita', price: 14 }],
        },
      ]);

      await refused();

      expect(await readOrders(visitId)).toEqual([]);
      expect((await readState())?.['status']).toBe('occupied');
    });

    /**
     * A client that could name its own price would make the whole revalidation
     * decorative. The number it sends is a claim, and a claim that is wrong in
     * the guest's favour is still wrong.
     */
    it('refuses a price the client invented', async () => {
      await ordering();

      expect((await refused([margherita({ price: 1 })])).reason).toBe(
        'priceChanged',
      );
    });

    it('refuses the whole order when one line of several moved', async () => {
      const visitId = await ordering();
      await setMenu([
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [{ id: MARGHERITA, name: 'Margherita', price: 12 }],
        },
        {
          id: 'category-dessert',
          title: 'Dessert',
          items: [{ id: TIRAMISU, name: 'Tiramisu', price: 7 }],
        },
      ]);

      const result = await refused([
        margherita(),
        { menuItemId: TIRAMISU, quantity: 1, price: 6 },
      ]);

      expect(result.reason).toBe('priceChanged');
      expect(result.item?.menuItemId).toBe(TIRAMISU);
      expect(await readOrders(visitId)).toEqual([]);
    });

    it('refuses an order in a currency the menu no longer states', async () => {
      await ordering();
      await getFirestore()
        .collection('menus')
        .doc(MENU)
        .update({ currency: 'CHF' });

      expect((await refused()).reason).toBe('currencyChanged');
    });

    /**
     * `Menu.currency` is optional and absent means "not stated" rather than a
     * default, which is right for a menu somebody is reading and impossible for
     * one somebody is ordering from: a line has to record what it charged.
     */
    it('refuses an order from a menu that states no currency', async () => {
      await ordering();
      await getFirestore()
        .collection('menus')
        .doc(MENU)
        .update({ currency: '' });

      expect((await refused()).reason).toBe('menuCurrencyMissing');
    });
  });

  describe('items that changed under the guest', () => {
    /**
     * The second acceptance criterion, and the reason the refusal carries an
     * item: "the Margherita is no longer available" is a sentence the guest can
     * act on and "one of your items is unavailable" is one they have to guess
     * at.
     */
    it('refuses an item marked off, naming it', async () => {
      await ordering();
      await setMenu([
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [
            {
              id: MARGHERITA,
              name: 'Margherita',
              price: 12,
              isAvailable: false,
            },
          ],
        },
      ]);

      expect(await refused()).toEqual({
        ok: false,
        reason: 'itemUnavailable',
        item: { menuItemId: MARGHERITA, name: 'Margherita' },
      });
    });

    /**
     * Unavailability travels down: a dish taken off the menu takes its sizes
     * with it, because offering the large one would be the menu contradicting
     * itself in the guest's face.
     */
    it('refuses a variant of a dish that is off', async () => {
      await ordering();
      await setMenu([
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [
            {
              id: MARGHERITA,
              name: 'Margherita',
              price: 12,
              isAvailable: false,
              variants: [{ id: MARGHERITA_LARGE, name: 'Large', price: 16 }],
            },
          ],
        },
      ]);

      expect(
        (
          await refused([
            margherita({ variantId: MARGHERITA_LARGE, price: 16 }),
          ])
        ).reason,
      ).toBe('itemUnavailable');
    });

    it('refuses a sold-out size of a dish that is still on', async () => {
      await ordering();
      await setMenu([
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [
            {
              id: MARGHERITA,
              name: 'Margherita',
              price: 12,
              variants: [
                {
                  id: MARGHERITA_LARGE,
                  name: 'Large',
                  price: 16,
                  isAvailable: false,
                },
              ],
            },
          ],
        },
      ]);

      const result = await refused([
        margherita({ variantId: MARGHERITA_LARGE, price: 16 }),
      ]);

      expect(result.reason).toBe('itemUnavailable');
      expect(result.item?.variantId).toBe(MARGHERITA_LARGE);
    });

    it('refuses an item that has been deleted from the menu', async () => {
      await ordering();
      await setMenu([
        {
          id: 'category-dessert',
          title: 'Dessert',
          items: [{ id: TIRAMISU, name: 'Tiramisu', price: 6 }],
        },
      ]);

      expect(await refused()).toEqual({
        ok: false,
        reason: 'itemMissing',
        item: { menuItemId: MARGHERITA },
      });
    });

    /**
     * A variant is reached through the dish it belongs to, so a client naming
     * the large Margherita as a variant of the tiramisu finds nothing - which
     * is what makes "this variant is a variant of that dish" a fact the order
     * establishes rather than one it assumes.
     */
    it('refuses a variant that does not belong to the dish named', async () => {
      await ordering();

      const result = await refused([
        {
          menuItemId: TIRAMISU,
          variantId: MARGHERITA_LARGE,
          quantity: 1,
          price: 6,
        },
      ]);

      expect(result.reason).toBe('itemMissing');
      expect(result.item?.variantId).toBe(MARGHERITA_LARGE);
    });
  });

  describe('a session that cannot order', () => {
    it('refuses a guest who never scanned this table', async () => {
      await ordering();

      expect((await refused([margherita()], bob)).reason).toBe(
        'sessionNotFound',
      );
    });

    /**
     * `pending` is the status whose entire meaning is that staff have not
     * confirmed the guest is there. A scan from the car park must not reach a
     * kitchen.
     */
    it('refuses a pending session', async () => {
      await start(alice);

      expect((await refused()).reason).toBe('sessionNotActive');
    });

    it('refuses a session the guest left', async () => {
      await ordering();
      await restaurantRef()
        .collection('tableSessions')
        .doc(tableSessionId(TABLE_12, ALICE))
        .update({ status: 'left', endedAt: LUNCHTIME.getTime() });

      expect((await refused()).reason).toBe('sessionNotActive');
    });

    /**
     * Expiry is observed at the moment somebody asks, and persisted - so a
     * document read after it expired stops reading as live to anything that
     * only knows the status.
     */
    it('refuses an idle session and writes the expiry it observed', async () => {
      await ordering();
      await restaurantRef()
        .collection('tableSessions')
        .doc(tableSessionId(TABLE_12, ALICE))
        .update({ lastActiveAt: LUNCHTIME.getTime() - 121 * MINUTE });

      expect((await refused()).reason).toBe('sessionExpired');
      expect((await readSession())?.['status']).toBe('expired');
    });

    /**
     * `visitClosed` is the race the session status cannot catch: a visit ended
     * without the commit that closes its sessions, which is what a partially
     * applied write or a later bug would look like. The document is edited
     * directly rather than through the callable, because the callable closes
     * both and would therefore test the branch above instead of this one.
     */
    it('refuses an order into a visit that ended under an active session', async () => {
      const visitId = await ordering();
      await restaurantRef()
        .collection('visits')
        .doc(visitId)
        .update({ status: 'closed', closedAt: LUNCHTIME.getTime() });

      expect((await refused()).reason).toBe('visitClosed');
    });

    /**
     * The other half of the same guard: a state document whose pointer has
     * moved on to another party while this session still names the old visit.
     * An order recorded against either is recorded against the wrong party.
     */
    it('refuses an order when the table now points at a different visit', async () => {
      await ordering();
      await restaurantRef()
        .collection('tableStates')
        .doc(TABLE_12)
        .update({ visitId: 'some-other-visit' });

      expect((await refused()).reason).toBe('visitClosed');
    });

    it('refuses an order while the kitchen is paused', async () => {
      await ordering();
      await restaurantRef().update({
        'tableOrdering.pausedUntilTimestamp': later(60).getTime(),
      });

      expect((await refused()).reason).toBe('orderingUnavailable');
    });

    it('refuses an order once table ordering is switched off', async () => {
      await ordering();
      await restaurantRef().update({ 'tableOrdering.enabled': false });

      expect((await refused()).reason).toBe('orderingUnavailable');
    });

    it('refuses an order when the restaurant has no menu', async () => {
      await ordering();
      await restaurantRef().update({ menuId: '' });

      expect((await refused()).reason).toBe('menuMissing');
    });
  });

  describe('what the request itself has to be', () => {
    it('refuses an order with no lines', async () => {
      await ordering();

      expect((await refused([])).reason).toBe('emptyOrder');
    });

    it('rejects a caller with no session at all', async () => {
      await ordering();

      expect(
        await codeOf(
          submitTableOrderHandler(
            {
              data: {
                restaurantId: RESTAURANT,
                tableId: TABLE_12,
                currency: EUR,
                lines: [margherita()],
              },
            } as never,
            LUNCHTIME,
          ),
        ),
      ).toBe('unauthenticated');
    });

    it('rejects a fractional quantity rather than rounding it', async () => {
      await ordering();

      expect(await codeOf(submit([margherita({ quantity: 1.5 })]))).toBe(
        'invalid-argument',
      );
    });

    it('rejects a quantity of zero rather than dropping the line', async () => {
      await ordering();

      expect(await codeOf(submit([margherita({ quantity: 0 })]))).toBe(
        'invalid-argument',
      );
    });

    it('rejects a note longer than the cap', async () => {
      await ordering();

      expect(
        await codeOf(submit([margherita({ notes: 'x'.repeat(281) })])),
      ).toBe('invalid-argument');
    });
  });

  describe('sending the same order twice (GitHub issue #1108)', () => {
    const KEY = 'abcdefgh-1108-key';

    const submitWithKey = (
      requestId: string,
      lines: Record<string, unknown>[] = [margherita()],
      guest: Guest = alice,
      now = LUNCHTIME,
    ): Promise<SubmitTableOrderResult> =>
      submit(lines, guest, now, { requestId });

    /**
     * The acceptance criterion, stated as plainly as it can be: a guest tapping
     * submit twice on a spinner must not order two schnitzels.
     */
    it('creates one order for two submissions carrying one key', async () => {
      const visitId = await ordering();

      const first = (await submitWithKey(KEY)) as TableOrderSubmitted;
      const second = (await submitWithKey(KEY)) as TableOrderSubmitted;

      expect(await readOrders(visitId)).toHaveLength(1);
      expect(second.order.id).toBe(first.order.id);
      expect(second.order.total).toBe(first.order.total);
    });

    /**
     * The second answer is the same outcome and not the same event. A phone
     * that gave up and retried is shown "this was already with the kitchen"
     * rather than a second confirmation of an order placed once.
     */
    it('marks the second answer as a replay and the first as not', async () => {
      await ordering();

      expect(
        ((await submitWithKey(KEY)) as TableOrderSubmitted).replayed,
      ).toBeUndefined();
      expect(((await submitWithKey(KEY)) as TableOrderSubmitted).replayed).toBe(
        true,
      );
    });

    /** The key names the document, so the order is findable by address. */
    it('names the order document after the key', async () => {
      const visitId = await ordering();

      const placed = (await submitWithKey(KEY)) as TableOrderSubmitted;

      expect(placed.order.id).toBe(`req-${KEY}`);
      expect(placed.order.requestId).toBe(KEY);
      expect((await readOrders(visitId))[0]['requestId']).toBe(KEY);
    });

    /**
     * Two copies of one request racing each other. The loser's read set is
     * touched by the winner's `create`, Firestore retries it, and the retry
     * finds the order - which is the whole reason the read is inside the
     * transaction rather than before it.
     */
    it('creates one order when both copies arrive together', async () => {
      const visitId = await ordering();

      const [first, second] = (await Promise.all([
        submitWithKey(KEY),
        submitWithKey(KEY),
      ])) as TableOrderSubmitted[];

      expect(await readOrders(visitId)).toHaveLength(1);
      expect(second.order.id).toBe(first.order.id);
    });

    /**
     * A replay arrives after the world has moved on. The kitchen pausing does
     * not make the order that already landed untrue, and a phone told
     * `orderingUnavailable` would go on retrying an order the restaurant is
     * already cooking.
     */
    it('answers a replay after the kitchen stopped taking orders', async () => {
      await ordering();
      const placed = (await submitWithKey(KEY)) as TableOrderSubmitted;

      await restaurantRef().update({
        tableOrdering: { enabled: false, timeZone: 'Europe/Berlin' },
      });

      const replayed = (await submitWithKey(KEY)) as TableOrderSubmitted;

      expect(replayed.ok).toBe(true);
      expect(replayed.order.id).toBe(placed.order.id);
      expect(replayed.replayed).toBe(true);
    });

    /**
     * And after the guest's own session went idle. The order is theirs either
     * way, and expiring the session under a replay would tell a guest at a
     * table with the food in front of them to scan the code again.
     */
    it('answers a replay after the session has been closed', async () => {
      await ordering();
      const placed = (await submitWithKey(KEY)) as TableOrderSubmitted;

      await restaurantRef()
        .collection('tableSessions')
        .doc(tableSessionId(TABLE_12, ALICE))
        .update({ status: 'closed', endedAt: LUNCHTIME.getTime() });

      const replayed = (await submitWithKey(KEY)) as TableOrderSubmitted;

      expect(replayed.order.id).toBe(placed.order.id);
      expect(replayed.replayed).toBe(true);
    });

    /**
     * A replay writes nothing, so the table moved once. A second
     * `occupied -> ordering` entry would put a change in the audit trail that
     * nobody made.
     */
    it('appends no second table transition for a replay', async () => {
      await ordering();

      await submitWithKey(KEY);
      const afterFirst = (await readTransitions()).length;
      await submitWithKey(KEY);

      expect(await readTransitions()).toHaveLength(afterFirst);
    });

    /** Two intents are two orders. The key identifies a tap, not a cart. */
    it('creates two orders for two keys', async () => {
      const visitId = await ordering();

      await submitWithKey(KEY);
      await submitWithKey('abcdefgh-1108-second');

      expect(await readOrders(visitId)).toHaveLength(2);
    });

    /**
     * A second order under the same key is refused even when its lines differ.
     * The key is the guest's statement that this is the submission they already
     * made, and honouring the new lines would let a retry rewrite an order the
     * kitchen is already cooking.
     */
    it('answers with the stored order rather than the lines sent again', async () => {
      const visitId = await ordering();

      await submitWithKey(KEY, [margherita()]);
      const replayed = (await submitWithKey(KEY, [
        { menuItemId: TIRAMISU, quantity: 3, price: 6 },
      ])) as TableOrderSubmitted;

      expect(replayed.order.lines).toHaveLength(1);
      expect(replayed.order.lines[0].menuItemId).toBe(MARGHERITA);
      expect(await readOrders(visitId)).toHaveLength(1);
    });

    /** An order placed without a key still works, and still gets an id. */
    it('places an order from a client that sends no key', async () => {
      const visitId = await ordering();

      const placed = await submitted();

      expect(placed.order.requestId).toBeUndefined();
      expect(await readOrders(visitId)).toHaveLength(1);
    });

    it('rejects a key that could not be a document name', async () => {
      await ordering();

      expect(await codeOf(submitWithKey('has/a/slash'))).toBe(
        'invalid-argument',
      );
      expect(await codeOf(submitWithKey('short'))).toBe('invalid-argument');
      expect(await codeOf(submitWithKey('x'.repeat(129)))).toBe(
        'invalid-argument',
      );
    });
  });

  describe('two phones at one table', () => {
    /**
     * The epic's per-line attribution, at the grain that actually exists: a
     * phone. The party shares a visit and a bill, and each order says which
     * phone sent it.
     */
    it('puts both guests orders under the one visit, each naming its sender', async () => {
      const visitId = await ordering();
      await start(bob);

      await submitted([margherita()], alice);
      await submitTableOrderHandler(
        guestRequest(bob, {
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          currency: EUR,
          lines: [{ menuItemId: TIRAMISU, quantity: 1, price: 6 }],
        }),
        LUNCHTIME,
      );

      expect(
        (await readOrders(visitId)).map((order) => order['guestUserId']).sort(),
      ).toEqual([ALICE, BOB]);
    });
  });
});
