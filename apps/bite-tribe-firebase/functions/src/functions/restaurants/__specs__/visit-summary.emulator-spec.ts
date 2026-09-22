import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { resetDurableScanRateLimit } from '../../shared/utils/durable-scan-rate-limit';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import { emailVisitSummaryHandler } from '../email-visit-summary';
import {
  listVisitSummariesHandler,
  readVisitSummaryHandler,
} from '../read-visit-summary';
import { settleTableVisitHandler } from '../settle-table-visit';
import { startTableSessionHandler } from '../start-table-session';
import { submitTableOrderHandler } from '../submit-table-order';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';
import { tableSessionId } from '../table-session';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';
import { writeVisitSummaries } from '../write-visit-summaries-on-close';

/**
 * The push transport is mocked, and not because it is inconvenient.
 *
 * `send-localized-notification` reaches a module that calls `getFirestore()`
 * at import time, which throws in a spec whose `initializeApp` has not run
 * yet - and there is no emulator for FCM regardless, so a real call could
 * prove nothing. What these specs are about is **which** summaries a run
 * picks up and what it writes on them, and that is all Firestore.
 */
jest.mock('../../shared/utils/send-localized-notification', () => ({
  sendLocalizedNotification: jest.fn().mockResolvedValue(1),
}));

import { remindAboutVisitSummaries } from '../remind-about-visit-summaries';

/**
 * What a guest keeps after the meal (GitHub issue #1111).
 *
 * ## Why this spec runs on the real clock
 *
 * Every other table spec pins a date and hands it to the callables that take
 * one. This one cannot: it has to **close** a visit, and until issue #1681
 * `transitionTableState` stamps `Date.now()` whatever the caller passes - so a
 * session started at a pinned date would be minutes or days idle by the time
 * the seating read it, and would expire instead of activating. That is the
 * defect #1681 fixes, and this spec is written not to depend on which side of
 * it the workspace is on: the restaurant below is open **every day**, the
 * sessions start now, and the one test that needs a stale session backdates
 * `lastActiveAt` itself.
 *
 * ## What is in doubt
 *
 * That the meal reaches every guest who was at the table and nobody else; that
 * the retention rule is the session's own clock rather than a second one; that
 * a guest gets exactly one mail and is told when they have used it; and that a
 * bill nobody was paid for cannot be closed by the same tap that clears a
 * table at the end of service.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const HOST = 'host-uid';
const ALICE = 'guest-alice';
const BOB = 'guest-bob';
const CAROL = 'guest-carol';

const RESTAURANT = 'owned-restaurant';
const DINING_ROOM = 'dining-room';
const TABLE_12 = 'table-12';
const MENU = 'menu-1';

const TOKEN = 'ABCDEFGHJKMNPQRSTVWXYZ0123';

const MARGHERITA = 'item-margherita';
const TIRAMISU = 'item-tiramisu';

const EUR = 'EUR';
const MINUTE = 60 * 1000;

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const guestRequest = (
  data: Record<string, unknown>,
  uid = ALICE,
  provider = 'anonymous',
): never =>
  ({
    auth: { uid, token: { firebase: { sign_in_provider: provider } } },
    data,
    rawRequest: { ip: '203.0.113.7' },
  }) as never;

/** The same guest, after registering. `RD-TS-40`: the provider is the gate. */
const memberRequest = (data: Record<string, unknown>, uid = ALICE): never =>
  guestRequest(data, uid, 'password');

const staffRequest = (data: Record<string, unknown>, uid = HOST): never =>
  ({ auth: { uid, token: { roles: ['staff'] } }, data }) as never;

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

const readSummary = async (
  uid: string,
  visitId: string,
): Promise<DocumentData | undefined> =>
  (
    await getFirestore()
      .collection('users')
      .doc(uid)
      .collection('visitSummaries')
      .doc(visitId)
      .get()
  ).data();

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

const seed = async (): Promise<void> => {
  const db = getFirestore();

  await restaurantRef().set({
    name: 'Owned Bistro',
    ownerUserId: OWNER,
    claimStatus: 'claimed',
    menuId: MENU,
    // Open every day, so the spec does not depend on which day it runs.
    openingHours: DAYS.map((day) => ({
      day,
      isOpen: true,
      timeRanges: [{ from: '00:00', to: '23:59' }],
    })),
    tableOrdering: { enabled: true, timeZone: 'Europe/Berlin' },
  });

  await Promise.all([
    restaurantRef()
      .collection('tables')
      .doc(TABLE_12)
      .set({
        label: '12',
        roomId: DINING_ROOM,
        position: { x: 2000, y: 3000 },
        rotation: 0,
        seats: 4,
        enabled: true,
        shape: 'round',
        diameter: 900,
      }),
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
            items: [{ id: TIRAMISU, name: 'Tiramisù', price: 6 }],
          },
        ],
      }),
    db.collection(TABLE_TOKENS_COLLECTION).doc(TOKEN).set({
      restaurantId: RESTAURANT,
      roomId: DINING_ROOM,
      tableId: TABLE_12,
      tableLabel: '12',
      tableEnabled: true,
      status: 'active',
      issuedAt: new Date().toISOString(),
      issuedAtTimestamp: Date.now(),
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
    db.recursiveDelete(db.collection('users')),
    db.recursiveDelete(db.collection(TABLE_TOKENS_COLLECTION)),
  ]);
};

const seat = (): Promise<TransitionTableStateResult> =>
  transitionTableStateHandler(
    staffRequest({
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      status: 'occupied',
      expectedStatus: 'available',
    }),
  );

const scan = (uid: string): Promise<unknown> =>
  startTableSessionHandler(guestRequest({ token: TOKEN }, uid));

const order = (uid = ALICE, item = MARGHERITA, price = 12): Promise<unknown> =>
  submitTableOrderHandler(
    guestRequest(
      {
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        currency: EUR,
        lines: [{ menuItemId: item, quantity: 1, price }],
      },
      uid,
    ),
  );

/**
 * Ends the visit, which needs the acknowledgement when nobody has paid.
 *
 * The status it contends against is **read** rather than named. Submitting an
 * order moves the table from `occupied` to `ordering` in the same commit
 * (`RD-TS-11`), so naming `'ordering'` would be right until the day an order
 * is refused for a reason this test does not care about - and the close would
 * then fail on an `expectedStatus` conflict rather than on the thing being
 * tested. Found by a full-suite run where exactly that happened once.
 */
const close = async (
  acknowledgeUnsettled = true,
): Promise<TransitionTableStateResult> => {
  const state = await restaurantRef()
    .collection('tableStates')
    .doc(TABLE_12)
    .get();

  return transitionTableStateHandler(
    staffRequest({
      restaurantId: RESTAURANT,
      tableId: TABLE_12,
      status: 'cleaning',
      expectedStatus: state.data()?.['status'] ?? 'occupied',
      acknowledgeUnsettled,
    }),
  );
};

/** Runs the trigger the way Firestore would, once the visit has ended. */
const fireTrigger = async (visitId: string): Promise<void> => {
  const after = await readVisit(visitId);

  await writeVisitSummaries(RESTAURANT, visitId, { status: 'open' }, after);
};

describe('the visit summary', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error('visit summary specs require the Firestore emulator.');
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

  describe('what closing files, and under whom', () => {
    it('files the same meal under every guest who was at the table', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await scan(BOB);
      await order(ALICE);
      await order(BOB, TIRAMISU, 6);
      await close();

      await fireTrigger(visitId);

      const [alice, bob] = await Promise.all([
        readSummary(ALICE, visitId),
        readSummary(BOB, visitId),
      ]);

      expect(alice).toMatchObject({
        restaurantId: RESTAURANT,
        restaurantName: 'Owned Bistro',
        tableLabel: '12',
        currency: EUR,
        total: 18,
      });
      expect(bob).toEqual(alice);
    });

    /**
     * `RD-TS-1`. Staff never confirmed this person was at the table, so filing
     * somebody else's dinner under their account is the failure that decision
     * exists to prevent.
     */
    it('files nothing under a guest who only ever scanned', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();

      // Carol scans after the table was cleared, so her session names no visit.
      await scan(CAROL);
      await fireTrigger(visitId);

      expect(await readSummary(CAROL, visitId)).toBeUndefined();
      expect(await readSummary(ALICE, visitId)).toBeDefined();
    });

    it('drops a cancelled order from the lines and the total', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      const cancelled = (await order(ALICE, TIRAMISU, 6)) as {
        order?: { id?: string };
      };

      await restaurantRef()
        .collection('visits')
        .doc(visitId)
        .collection('orders')
        .doc(cancelled.order?.id ?? '')
        .update({ status: 'cancelled' });

      await close();
      await fireTrigger(visitId);

      expect(await readSummary(ALICE, visitId)).toMatchObject({ total: 12 });
    });

    it('carries the settlement the restaurant recorded', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'card' }),
      );
      await close();
      await fireTrigger(visitId);

      expect(await readSummary(ALICE, visitId)).toMatchObject({
        paymentStatus: 'settled',
        settlementMethod: 'card',
      });
    });

    /** A trigger is at-least-once, so this one is written to be run twice. */
    it('does nothing on an update that ends nothing', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);

      await writeVisitSummaries(
        RESTAURANT,
        visitId,
        { status: 'open' },
        { status: 'open', tableId: TABLE_12 },
      );

      expect(await readSummary(ALICE, visitId)).toBeUndefined();
    });

    /**
     * The re-run must not take back the one send a guest has already used.
     * That is why the write is a merge rather than a replacement.
     */
    it('keeps an emailed stamp when it runs a second time', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      await emailVisitSummaryHandler(
        guestRequest({ visitId, email: 'alice@example.com' }),
        new Date(),
        async () => undefined,
      );
      await fireTrigger(visitId);

      expect(await readSummary(ALICE, visitId)).toMatchObject({
        emailedAt: expect.any(Number),
      });
    });
  });

  describe('how long a guest keeps it', () => {
    const read = (
      uid: string,
      visitId: string,
      member = false,
    ): Promise<unknown> =>
      readVisitSummaryHandler(
        (member ? memberRequest : guestRequest)(
          { visitId, restaurantId: RESTAURANT, tableId: TABLE_12 },
          uid,
        ) as never,
      );

    it('answers an unregistered guest whose session is still fresh', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      expect(await read(ALICE, visitId)).toMatchObject({ ok: true });
    });

    /**
     * `RD-TS-46`, resting on `RD-TS-5`. The session's own clock is the only
     * one, which is why the summary needs no expiry field of its own.
     */
    it('refuses an unregistered guest once their session has gone idle', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      await restaurantRef()
        .collection('tableSessions')
        .doc(tableSessionId(TABLE_12, ALICE))
        .update({ lastActiveAt: Date.now() - 180 * MINUTE });

      expect(await read(ALICE, visitId)).toMatchObject({
        ok: false,
        reason: 'sessionExpired',
      });
    });

    /** A member is at home a month later, and the account is the membership. */
    it('answers a member whose session went idle long ago', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      await restaurantRef()
        .collection('tableSessions')
        .doc(tableSessionId(TABLE_12, ALICE))
        .update({ lastActiveAt: Date.now() - 180 * MINUTE });

      expect(await read(ALICE, visitId, true)).toMatchObject({ ok: true });
    });

    it('refuses a visit filed under somebody else', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      expect(await read(BOB, visitId, true)).toMatchObject({
        ok: false,
        reason: 'notFound',
      });
    });

    it('lists a member’s meals, newest first', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      const listed = (await listVisitSummariesHandler(
        memberRequest({}) as never,
      )) as { summaries: { id: string }[] };

      expect(listed.summaries.map((entry) => entry.id)).toEqual([visitId]);
    });

    /** A guest who never registered has the one meal they are sitting at. */
    it('lists nothing for an unregistered guest', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      const listed = (await listVisitSummariesHandler(
        guestRequest({}) as never,
      )) as { summaries: unknown[] };

      expect(listed.summaries).toEqual([]);
    });
  });

  describe('sending it by mail', () => {
    const emailed = async (
      visitId: string,
      email = 'alice@example.com',
      send: () => Promise<void> = async () => undefined,
    ): Promise<unknown> =>
      emailVisitSummaryHandler(
        guestRequest({ visitId, email }),
        new Date(),
        send,
      );

    const closedVisit = async (): Promise<string> => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await close();
      await fireTrigger(visitId);

      return visitId;
    };

    it('sends once and records when', async () => {
      const visitId = await closedVisit();
      const sent: { to: string }[] = [];

      const result = await emailVisitSummaryHandler(
        guestRequest({ visitId, email: 'alice@example.com' }),
        new Date(),
        async (email) => {
          sent.push(email);
        },
      );

      expect(result).toMatchObject({ ok: true });
      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe('alice@example.com');
      expect(await readSummary(ALICE, visitId)).toMatchObject({
        emailedAt: expect.any(Number),
      });
    });

    /**
     * `RD-TS-48`. The bound is the visit, which a caller cannot mint - an
     * anonymous account is free and unlimited (`RD-TS-4`), so a per-guest rate
     * limit would bucket a determined sender by nothing.
     */
    it('refuses a second send and says so rather than pretending', async () => {
      const visitId = await closedVisit();
      await emailed(visitId);

      expect(await emailed(visitId, 'somebody-else@example.com')).toMatchObject(
        { ok: false, reason: 'alreadySent' },
      );
    });

    it('does not store the address anywhere on the summary', async () => {
      const visitId = await closedVisit();
      await emailed(visitId, 'alice@example.com');

      const stored = JSON.stringify(await readSummary(ALICE, visitId));

      expect(stored).not.toContain('alice@example.com');
      expect(stored).not.toContain('example.com');
    });

    it('refuses an address that is not one', async () => {
      const visitId = await closedVisit();

      expect(await emailed(visitId, 'not-an-address')).toMatchObject({
        ok: false,
        reason: 'invalidAddress',
      });
    });

    /** A header separator would let one field become two. */
    it('refuses an address carrying a newline', async () => {
      const visitId = await closedVisit();

      expect(
        await emailed(visitId, 'a@b.com\nBcc: everyone@example.com'),
      ).toMatchObject({ ok: false, reason: 'invalidAddress' });
    });

    it('refuses a visit this guest was never on', async () => {
      await closedVisit();

      expect(await emailed('no-such-visit')).toMatchObject({
        ok: false,
        reason: 'notFound',
      });
    });

    /**
     * The stamp means "a mail went out". None did, so the guest keeps the one
     * send they were promised.
     */
    it('gives the send back when the transport fails', async () => {
      const visitId = await closedVisit();

      const failed = await emailed(visitId, 'alice@example.com', async () => {
        throw new Error('gmail said no');
      });

      expect(failed).toMatchObject({ ok: false, reason: 'sendFailed' });
      expect(await readSummary(ALICE, visitId)).not.toMatchObject({
        emailedAt: expect.any(Number),
      });
      expect(await emailed(visitId)).toMatchObject({ ok: true });
    });
  });

  /**
   * Turning a meal into a Bite, and the one reminder (GitHub issue #1112).
   *
   * The trigger that marks a summary converted is not exercised here - it
   * watches `bites` and the flag is what matters - so these set `biteCreated`
   * the way the trigger would and check what the reminder does about it.
   */
  describe('the one reminder', () => {
    /** A meal that closed yesterday, which is the window the sweep reads. */
    const YESTERDAY = new Date();

    YESTERDAY.setDate(YESTERDAY.getDate() - 1);
    YESTERDAY.setHours(20, 0, 0, 0);

    const closedYesterday = async (
      uid = ALICE,
      extra: Record<string, unknown> = {},
    ): Promise<void> => {
      await getFirestore()
        .collection('users')
        .doc(uid)
        .collection('visitSummaries')
        .doc(`visit-${uid}`)
        .set({
          id: `visit-${uid}`,
          restaurantId: RESTAURANT,
          restaurantName: 'Owned Bistro',
          tableLabel: '12',
          closedAt: YESTERDAY.getTime(),
          currency: EUR,
          lines: [],
          total: 12,
          paymentStatus: 'settled',
          biteCreated: false,
          reminded: false,
          ...extra,
        });
    };

    const readFlags = async (uid = ALICE): Promise<DocumentData | undefined> =>
      (
        await getFirestore()
          .collection('users')
          .doc(uid)
          .collection('visitSummaries')
          .doc(`visit-${uid}`)
          .get()
      ).data();

    it('marks a meal as reminded about', async () => {
      await closedYesterday();

      await remindAboutVisitSummaries();

      expect(await readFlags()).toMatchObject({ reminded: true });
    });

    /** `RD-TS-51`. One ask at the table, one the next morning, then never. */
    it('does not ask a second time', async () => {
      await closedYesterday(ALICE, { reminded: true });

      await remindAboutVisitSummaries();

      // Still reminded, and the run found nothing to change - which is what
      // the `where` clause is for rather than a check inside the loop.
      expect(await readFlags()).toMatchObject({ reminded: true });
    });

    it('leaves a meal that already became a Bite alone', async () => {
      await closedYesterday(ALICE, { biteCreated: true });

      await remindAboutVisitSummaries();

      expect(await readFlags()).toMatchObject({ reminded: false });
    });

    /**
     * The window is yesterday. A meal that ended an hour ago has just had the
     * offer on the summary screen, and one from last week is a meal nobody is
     * going to write about now.
     */
    it('leaves a meal from today alone', async () => {
      await closedYesterday(ALICE, { closedAt: Date.now() });

      await remindAboutVisitSummaries();

      expect(await readFlags()).toMatchObject({ reminded: false });
    });

    it('leaves a meal from last week alone', async () => {
      const lastWeek = new Date();

      lastWeek.setDate(lastWeek.getDate() - 8);
      await closedYesterday(ALICE, { closedAt: lastWeek.getTime() });

      await remindAboutVisitSummaries();

      expect(await readFlags()).toMatchObject({ reminded: false });
    });

    it('reminds every guest who was at the table', async () => {
      await closedYesterday(ALICE);
      await closedYesterday(BOB);

      await remindAboutVisitSummaries();

      expect(await readFlags(ALICE)).toMatchObject({ reminded: true });
      expect(await readFlags(BOB)).toMatchObject({ reminded: true });
    });
  });

  describe('closing a bill nobody was paid for', () => {
    it('refuses the close until staff confirm it', async () => {
      await seat();
      await scan(ALICE);
      await order(ALICE);

      expect(await codeOf(close(false))).toBe('failed-precondition');
    });

    it('goes through once they do', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);

      await close(true);

      expect((await readVisit(visitId))?.['status']).toBe('closed');
    });

    /** An ordinary meal that was paid for is one tap, not two. */
    it('asks for nothing when the bill was settled', async () => {
      const { visitId = '' } = await seat();
      await scan(ALICE);
      await order(ALICE);
      await settleTableVisitHandler(
        staffRequest({ restaurantId: RESTAURANT, visitId, method: 'cash' }),
      );

      await close(false);

      expect((await readVisit(visitId))?.['status']).toBe('closed');
    });

    /** A table nobody sat at has no bill to forget. */
    it('asks for nothing when no visit is ending', async () => {
      await transitionTableStateHandler(
        staffRequest({
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          status: 'reserved',
          expectedStatus: 'available',
        }),
      );

      const state = await restaurantRef()
        .collection('tableStates')
        .doc(TABLE_12)
        .get();

      expect(state.data()?.['status']).toBe('reserved');
    });
  });
});
