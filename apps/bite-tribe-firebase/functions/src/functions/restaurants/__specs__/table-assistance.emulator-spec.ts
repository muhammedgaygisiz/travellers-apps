import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import { acknowledgeTableAssistanceHandler } from '../acknowledge-table-assistance';
import {
  RequestTableAssistanceResult,
  TableAssistanceRaised,
  requestTableAssistanceHandler,
} from '../request-table-assistance';
import { startTableSessionHandler } from '../start-table-session';
import { submitTableOrderHandler } from '../submit-table-order';
import {
  TABLE_ASSISTANCE_COOLDOWN_MS,
  tableAssistanceRequestId,
} from '../table-assistance';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';

/**
 * A guest calling for a waiter, against the real database
 * (GitHub issue #1106).
 *
 * The emulator rather than a fake Firestore, for the reason the order specs
 * next door give: every claim here is about a transaction over documents
 * another caller may have moved in between, and a mocked store would assert
 * that the code called `set` - which was never the part in doubt.
 *
 * What is in doubt, and what each block below pins down: that a repeated tap
 * joins the signal that is up instead of raising a second one, that a signal
 * raised again too soon is refused with the moment it may be asked for, that
 * asking for the bill moves the table and asking for a waiter does not, that
 * only a party the floor agrees is sitting somewhere can raise one, and that
 * an acknowledgement clears it for everybody and survives being pressed twice.
 *
 * The read half - who may see a signal - is a rules question and lives in
 * `src/firestore-rules/__specs__`. The Admin SDK bypasses rules, so it cannot
 * be checked from here.
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

const EUR = 'EUR';

/** Wednesday 2026-09-16, 12:00 in Berlin. The restaurant is open. */
const LUNCHTIME = new Date('2026-09-16T10:00:00Z');

/** A minute and a second later, which is past the cooldown. */
const AFTER_COOLDOWN = new Date(
  LUNCHTIME.getTime() + TABLE_ASSISTANCE_COOLDOWN_MS + 1_000,
);

/** Half a minute later, which is not. */
const WITHIN_COOLDOWN = new Date(
  LUNCHTIME.getTime() + TABLE_ASSISTANCE_COOLDOWN_MS / 2,
);

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

const assistanceRef = (
  kind: 'callStaff' | 'requestBill',
  tableId = TABLE_12,
): DocumentReference =>
  restaurantRef()
    .collection('assistanceRequests')
    .doc(tableAssistanceRequestId(tableId, kind));

const readAssistance = async (
  kind: 'callStaff' | 'requestBill',
): Promise<DocumentData | undefined> =>
  (await assistanceRef(kind).get()).data();

const readTableStatus = async (): Promise<string | undefined> =>
  (
    await restaurantRef().collection('tableStates').doc(TABLE_12).get()
  ).data()?.['status'] as string | undefined;

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

/** A table with a party seated at it and one guest attached to the visit. */
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

const ask = (
  kind: 'callStaff' | 'requestBill',
  now: Date = LUNCHTIME,
  uid = ALICE,
): Promise<RequestTableAssistanceResult> =>
  requestTableAssistanceHandler(
    guestRequest({ restaurantId: RESTAURANT, tableId: TABLE_12, kind }, uid),
    now,
  );

const acknowledge = (
  kind: 'callStaff' | 'requestBill',
  now: Date = LUNCHTIME,
  uid = HOST,
  roles: string[] = ['staff'],
): Promise<unknown> =>
  acknowledgeTableAssistanceHandler(
    staffRequest(
      { restaurantId: RESTAURANT, tableId: TABLE_12, kind },
      uid,
      roles,
    ),
    now,
  );

const raised = (result: RequestTableAssistanceResult): TableAssistanceRaised =>
  result as TableAssistanceRaised;

describe('request staff assistance and request the bill', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table assistance emulator specs require the Firestore emulator.',
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

  describe('raising one', () => {
    it('writes a signal naming the table, the visit and who asked', async () => {
      const visitId = await seatAlice();

      const result = raised(await ask('callStaff'));

      expect(result.ok).toBe(true);
      expect(result.alreadyOpen).toBe(false);
      expect(await readAssistance('callStaff')).toMatchObject({
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        visitId,
        kind: 'callStaff',
        status: 'open',
        requestedAt: LUNCHTIME.getTime(),
        lastRequestedAt: LUNCHTIME.getTime(),
        requestedByUserIds: [ALICE],
      });
    });

    /**
     * The document name is the rate limit, so this is the acceptance criterion
     * "repeated taps do not create repeated signals" asserted where it is
     * actually enforced: the second call addresses the first call's document.
     */
    it('joins the signal that is already up rather than raising a second', async () => {
      await seatAlice();
      await ask('callStaff');

      const again = raised(await ask('callStaff', WITHIN_COOLDOWN));

      expect(again.alreadyOpen).toBe(true);

      const requests = await restaurantRef()
        .collection('assistanceRequests')
        .get();

      expect(requests.size).toBe(1);
    });

    /**
     * The age on the staff row is `requestedAt` and it does not move, which is
     * what stops a guest tapping their way to the top of a list sorted by who
     * has been waiting longest. The second tap is still recorded, because a
     * guest who asked twice is a guest who thinks nobody heard them.
     */
    it('records the repeat without resetting how long the table has waited', async () => {
      await seatAlice();
      await ask('callStaff');
      await ask('callStaff', WITHIN_COOLDOWN);

      expect(await readAssistance('callStaff')).toMatchObject({
        requestedAt: LUNCHTIME.getTime(),
        lastRequestedAt: WITHIN_COOLDOWN.getTime(),
      });
    });

    /**
     * A signal belongs to a table rather than to a phone, so the friend beside
     * the guest joins the same one - and is added to the reader list, which is
     * what lets their screen show the answer too.
     */
    it('lets a second guest at the table join the same signal', async () => {
      await seatAlice();
      await startTableSessionHandler(
        guestRequest({ token: TOKEN }, BOB),
        LUNCHTIME,
      );

      await ask('callStaff');
      const joined = raised(await ask('callStaff', WITHIN_COOLDOWN, BOB));

      expect(joined.alreadyOpen).toBe(true);
      expect(await readAssistance('callStaff')).toMatchObject({
        requestedByUserIds: [ALICE, BOB],
      });
    });

    it('keeps the two kinds apart', async () => {
      await seatAlice();

      await ask('callStaff');
      await ask('requestBill');

      const requests = await restaurantRef()
        .collection('assistanceRequests')
        .get();

      expect(requests.size).toBe(2);
    });
  });

  describe('the cooldown', () => {
    /**
     * The half the derived name cannot provide: raise, be answered, raise
     * again. Without it a guest could keep a marker on the room view with two
     * taps a minute, which is what "one impatient guest cannot flood the room
     * view" is about.
     */
    it('refuses a fresh signal inside the minute, naming when it may be asked', async () => {
      await seatAlice();
      await ask('callStaff');
      await acknowledge('callStaff');

      const refused = await ask('callStaff', WITHIN_COOLDOWN);

      expect(refused).toMatchObject({
        ok: false,
        reason: 'cooldown',
        retryAt: LUNCHTIME.getTime() + TABLE_ASSISTANCE_COOLDOWN_MS,
      });
      expect(await readAssistance('callStaff')).toMatchObject({
        status: 'acknowledged',
      });
    });

    it('lets the table ask again once the minute is up', async () => {
      await seatAlice();
      await ask('callStaff');
      await acknowledge('callStaff');

      const again = raised(await ask('callStaff', AFTER_COOLDOWN));

      expect(again.ok).toBe(true);
      expect(again.alreadyOpen).toBe(false);
      expect(await readAssistance('callStaff')).toMatchObject({
        status: 'open',
        requestedAt: AFTER_COOLDOWN.getTime(),
        requestedByUserIds: [ALICE],
      });
    });

    /**
     * The clock is measured from the request and the cooldown is per kind, so
     * a party told somebody is coming can still ask for the bill - which is
     * usually the next thing that happens.
     */
    it('does not hold the other kind back', async () => {
      await seatAlice();
      await ask('callStaff');
      await acknowledge('callStaff');

      expect(raised(await ask('requestBill', WITHIN_COOLDOWN)).ok).toBe(true);
    });

    /**
     * The acknowledged signal is replaced rather than merged into, so an open
     * one never carries the name of whoever cleared the one before it - which
     * a staff screen would read as already taken.
     */
    it('leaves no trace of the acknowledgement on the new signal', async () => {
      await seatAlice();
      await ask('callStaff');
      await acknowledge('callStaff');
      await ask('callStaff', AFTER_COOLDOWN);

      const stored = await readAssistance('callStaff');

      expect(stored?.['acknowledgedAt']).toBeUndefined();
      expect(stored?.['acknowledgedByUserId']).toBeUndefined();
    });
  });

  describe('asking for the bill', () => {
    it('moves the table to awaitingPayment and records the move', async () => {
      const visitId = await seatAlice();

      const result = raised(await ask('requestBill'));

      expect(result.tableStatus).toBe('awaitingPayment');
      expect(await readTableStatus()).toBe('awaitingPayment');

      const trail = await restaurantRef()
        .collection('tableStateTransitions')
        .where('to', '==', 'awaitingPayment')
        .get();

      expect(trail.size).toBe(1);
      expect(trail.docs[0].data()).toMatchObject({
        from: 'occupied',
        to: 'awaitingPayment',
        actorUserId: ALICE,
        visitId,
      });
    });

    /** Calling a waiter says nothing about the floor, so it moves nothing. */
    it('leaves the table alone when a waiter is called', async () => {
      await seatAlice();

      const result = raised(await ask('callStaff'));

      expect(result.tableStatus).toBe('occupied');
      expect(await readTableStatus()).toBe('occupied');
    });

    /**
     * A party whose waiter has not come asks again, and the status the first
     * request caused must not be what refuses the second.
     */
    it('admits a second bill request from a table already awaiting payment', async () => {
      await seatAlice();
      await ask('requestBill');
      await acknowledge('requestBill');

      const again = raised(await ask('requestBill', AFTER_COOLDOWN));

      expect(again.ok).toBe(true);
      expect(again.tableStatus).toBe('awaitingPayment');
    });

    /**
     * `ORDERABLE_TABLE_STATUSES` deliberately excludes `awaitingPayment`, so
     * the bill request is also what closes a table's ordering - asserted here
     * because the two callables are the halves of one product rule.
     */
    it('stops the table taking further orders', async () => {
      await seatAlice();
      await ask('requestBill');

      const refused = await submitTableOrderHandler(
        guestRequest({
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          currency: EUR,
          lines: [{ menuItemId: MARGHERITA, quantity: 1, price: 12 }],
        }),
        LUNCHTIME,
      );

      expect(refused).toMatchObject({ ok: false, reason: 'tableNotOrderable' });
    });
  });

  describe('who may raise one', () => {
    it('refuses a guest with no session at the table', async () => {
      await seatAlice();

      expect(await ask('callStaff', LUNCHTIME, BOB)).toMatchObject({
        ok: false,
        reason: 'sessionNotFound',
      });
    });

    /**
     * A guest who scanned before staff seated them holds a `pending` session.
     * Making that visible to the floor is issue #1107's, and a second signal
     * from a table nobody has been given would be two rows for one person
     * waiting at the door.
     */
    it('refuses a guest whose table has not been seated', async () => {
      await startTableSessionHandler(guestRequest({ token: TOKEN }), LUNCHTIME);

      expect(await ask('callStaff')).toMatchObject({
        ok: false,
        reason: 'sessionNotActive',
      });
    });

    it('refuses a party whose visit staff have closed', async () => {
      await seatAlice();

      await transitionTableStateHandler(
        staffRequest({
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          status: 'cleaning',
          expectedStatus: 'occupied',
        }),
      );

      expect(await ask('callStaff')).toMatchObject({
        ok: false,
        reason: 'sessionNotActive',
      });
    });

    /**
     * Ordering being off or the kitchen being shut has nothing to do with
     * whether somebody sitting in the dining room may ask for the bill - and
     * the moment they most need to is after the kitchen closes.
     */
    it('lets a table ask after the restaurant stops taking orders', async () => {
      await seatAlice();

      await restaurantRef().update({
        tableOrdering: {
          enabled: true,
          timeZone: 'Europe/Berlin',
          pausedUntilTimestamp: LUNCHTIME.getTime() + 3_600_000,
        },
      });

      expect(raised(await ask('requestBill')).ok).toBe(true);
    });
  });

  describe('acknowledging one', () => {
    it('clears the signal and records who answered and when', async () => {
      await seatAlice();
      await ask('callStaff');

      const result = await acknowledge('callStaff', WITHIN_COOLDOWN);

      expect(result).toMatchObject({
        status: 'acknowledged',
        acknowledgedByUserId: HOST,
        acknowledgedAt: WITHIN_COOLDOWN.getTime(),
        changed: true,
      });
      expect(await readAssistance('callStaff')).toMatchObject({
        status: 'acknowledged',
        acknowledgedByUserId: HOST,
      });
    });

    /**
     * The one place this deliberately differs from an order transition. An
     * order has four destinations and two people can want different ones; an
     * acknowledgement has one, so the second press is answered with what the
     * first wrote rather than with an error about a race that cost nobody
     * anything.
     */
    it('answers a second press with what the first one wrote', async () => {
      await seatAlice();
      await ask('callStaff');
      await acknowledge('callStaff', WITHIN_COOLDOWN);

      const second = await acknowledge('callStaff', AFTER_COOLDOWN, OWNER, [
        'business',
      ]);

      expect(second).toMatchObject({
        changed: false,
        acknowledgedByUserId: HOST,
        acknowledgedAt: WITHIN_COOLDOWN.getTime(),
      });
    });

    /** What the guest asked and when is theirs, and is never rewritten here. */
    it('leaves when it was asked and by whom alone', async () => {
      await seatAlice();
      await ask('callStaff');
      await acknowledge('callStaff', WITHIN_COOLDOWN);

      expect(await readAssistance('callStaff')).toMatchObject({
        requestedAt: LUNCHTIME.getTime(),
        requestedByUserIds: [ALICE],
      });
    });

    it('refuses a member of staff from another restaurant', async () => {
      await seatAlice();
      await ask('callStaff');

      expect(
        await codeOf(acknowledge('callStaff', LUNCHTIME, OTHER_HOST)),
      ).toBe('permission-denied');
      expect(await readAssistance('callStaff')).toMatchObject({
        status: 'open',
      });
    });

    it('refuses the guest who raised it', async () => {
      await seatAlice();
      await ask('callStaff');

      expect(await codeOf(acknowledge('callStaff', LUNCHTIME, ALICE, []))).toBe(
        'permission-denied',
      );
    });

    it('says so when there is nothing at that table to answer', async () => {
      await seatAlice();

      expect(await codeOf(acknowledge('callStaff'))).toBe('not-found');
    });
  });
});
