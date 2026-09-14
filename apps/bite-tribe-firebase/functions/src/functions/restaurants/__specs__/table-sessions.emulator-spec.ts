import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { resetDurableScanRateLimit } from '../../shared/utils/durable-scan-rate-limit';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import {
  LeaveTableSessionResult,
  leaveTableSessionHandler,
} from '../leave-table-session';
import {
  StartTableSessionResult,
  TableSessionStarted,
  startTableSessionHandler,
} from '../start-table-session';
import { TableScanRefused } from '../table-scan';
import { tableSessionId } from '../table-session';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';

/**
 * Guest table sessions against the real database (GitHub issue #1101).
 *
 * The emulator rather than a fake Firestore, for the reason the visit specs
 * next door give: every claim this issue makes is about several documents
 * agreeing or not agreeing - a session and the state that points at the visit
 * it names, a seating that activates three pending sessions in the commit that
 * opens the visit, a guest leaving without disturbing the friend beside them.
 * A mocked store would assert that the code called `set`, which was never the
 * part in doubt.
 *
 * The rules half - that no client may write a session, and that a guest reads
 * only their own - is in `src/firestore-rules/__specs__`. The Admin SDK
 * bypasses rules, so it cannot be checked from here.
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
const TOKEN_TABLE_5 = '0123456789ABCDEFGHJKMNPQRS';

/** Wednesday 2026-09-16, 12:00 in Berlin. The restaurant is open. */
const LUNCHTIME = new Date('2026-09-16T10:00:00Z');

const MINUTE = 60 * 1000;

/**
 * An instant later in the same service.
 *
 * Later rather than earlier, because the scan that starts a session is checked
 * against the opening hours on the same clock: an hour before lunch the
 * restaurant is shut, and the start is refused before it reaches any of this.
 * The restaurant seeded below serves until 23:00, so an hour and a half after
 * noon is still lunch.
 */
const later = (minutes: number): Date =>
  new Date(LUNCHTIME.getTime() + minutes * MINUTE);

interface Guest {
  uid: string;
  anonymous?: boolean;
}

const alice: Guest = { uid: ALICE, anonymous: true };
const bob: Guest = { uid: BOB, anonymous: true };
const member: Guest = { uid: ALICE };

const guestRequest = (guest: Guest, data: Record<string, unknown>): never =>
  ({
    auth: {
      uid: guest.uid,
      token: {
        firebase: {
          sign_in_provider: guest.anonymous ? 'anonymous' : 'password',
        },
      },
    },
    data,
    rawRequest: { ip: '203.0.113.7' },
  }) as never;

const start = (
  guest: Guest = alice,
  token = TOKEN,
  now = LUNCHTIME,
): Promise<StartTableSessionResult> =>
  startTableSessionHandler(guestRequest(guest, { token }), now);

const started = async (
  guest: Guest = alice,
  token = TOKEN,
  now = LUNCHTIME,
): Promise<TableSessionStarted> =>
  (await start(guest, token, now)) as TableSessionStarted;

const refused = async (
  guest: Guest = alice,
  token = TOKEN,
  now = LUNCHTIME,
): Promise<TableScanRefused> =>
  (await start(guest, token, now)) as TableScanRefused;

const leave = (
  guest: Guest = alice,
  tableId = TABLE_12,
  now = LUNCHTIME,
): Promise<LeaveTableSessionResult> =>
  leaveTableSessionHandler(
    guestRequest(guest, { restaurantId: RESTAURANT, tableId }),
    now,
  );

const staffRequest = (data: Record<string, unknown>): never =>
  ({ auth: { uid: HOST, token: { roles: ['staff'] } }, data }) as never;

const transition = (
  tableId: string,
  to: string,
  from: string,
  extra: Record<string, unknown> = {},
): Promise<TransitionTableStateResult> =>
  transitionTableStateHandler(
    staffRequest({
      restaurantId: RESTAURANT,
      tableId,
      status: to,
      expectedStatus: from,
      ...extra,
    }),
  );

/** The ordinary seating: a free table takes a party, opening a visit. */
const seat = (tableId = TABLE_12): Promise<TransitionTableStateResult> =>
  transition(tableId, 'occupied', 'available');

/** The ordinary ending: a seated table is turned over, closing its visit. */
const free = (
  tableId = TABLE_12,
  extra: Record<string, unknown> = {},
): Promise<TransitionTableStateResult> =>
  transition(tableId, 'cleaning', 'occupied', extra);

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

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

const readSessions = async (): Promise<DocumentData[]> => {
  const snapshot = await restaurantRef().collection('tableSessions').get();

  return snapshot.docs
    .map((session) => session.data())
    .sort((left, right) =>
      String(left['guestUserId']).localeCompare(String(right['guestUserId'])),
    );
};

/**
 * Pushes a session's idle clock into the past.
 *
 * The document is edited rather than the session being started at an earlier
 * instant, because the scan that starts one is checked against the restaurant's
 * opening hours on the same clock: a start ninety minutes before lunch is
 * refused with `restaurantClosed` and never reaches the session at all. Going
 * idle is a thing that happens to a session over time, and this is that, with
 * the time removed.
 *
 * `transitionTableState` stamps its own `Date.now()`, so a backdate meant to be
 * read by a seating is measured from the real clock rather than from the
 * injected one.
 */
const goIdle = (
  from: number,
  minutes: number,
  guest: Guest = alice,
  tableId = TABLE_12,
): Promise<unknown> =>
  restaurantRef()
    .collection('tableSessions')
    .doc(tableSessionId(tableId, guest.uid))
    .update({ lastActiveAt: from - minutes * MINUTE });

/** The restaurant's own idle timeout, in minutes. */
const setIdleTimeout = (minutes: number): Promise<unknown> =>
  restaurantRef().update({
    'tableOrdering.sessionIdleTimeoutMinutes': minutes,
  });

const readVisits = async (): Promise<DocumentData[]> =>
  (await restaurantRef().collection('visits').get()).docs.map((visit) =>
    visit.data(),
  );

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

const token = (tableId: string, label: string): Record<string, unknown> => ({
  restaurantId: RESTAURANT,
  roomId: DINING_ROOM,
  tableId,
  tableLabel: label,
  tableEnabled: true,
  status: 'active',
  issuedAt: '2026-09-01T09:00:00.000Z',
  issuedAtTimestamp: Date.parse('2026-09-01T09:00:00.000Z'),
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
    db
      .collection('menus')
      .doc(MENU)
      .set({
        id: MENU,
        restaurantId: RESTAURANT,
        categories: [
          {
            id: 'category-pizza',
            title: 'Pizza',
            items: [{ id: 'item-margherita', name: 'Margherita', price: 12 }],
          },
        ],
      }),
    db
      .collection(TABLE_TOKENS_COLLECTION)
      .doc(TOKEN)
      .set(token(TABLE_12, '12')),
    db
      .collection(TABLE_TOKENS_COLLECTION)
      .doc(TOKEN_TABLE_5)
      .set(token(TABLE_5, '5')),
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

describe('guest table sessions', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table session emulator specs require the Firestore emulator.',
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

  describe('starting at a table nobody has seated', () => {
    /**
     * The stage 2 decision, as a test. A QR code proves a table context and
     * never a presence, so a scan raises a signal rather than taking a table
     * out of service.
     */
    it('creates a pending session', async () => {
      const result = await started();

      expect(result.status).toBe('pending');
      expect(result.session).toMatchObject({
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        guestUserId: ALICE,
        status: 'pending',
        isAnonymousGuest: true,
      });
      expect(result.session.visitId).toBeUndefined();
    });

    /**
     * The half that matters to the restaurant. A scan from the car park must
     * cost a row on a screen and nothing else - not a table the next party
     * cannot be seated at.
     */
    it('leaves the table free and opens no visit', async () => {
      await started();

      expect(
        (await restaurantRef().collection('tableStates').doc(TABLE_12).get())
          .exists,
      ).toBe(false);
      expect(await readVisits()).toEqual([]);
    });

    it('answers with the restaurant and table the guest is looking at', async () => {
      const { context } = await started();

      expect(context.restaurant.name).toBe('Owned Bistro');
      expect(context.table).toEqual({ id: TABLE_12, label: '12', seats: 4 });
    });
  });

  describe('starting at a table that is already seated', () => {
    it('joins the open visit straight away', async () => {
      const seating = await seat();
      const result = await started();

      expect(result.status).toBe('active');
      expect(result.session.visitId).toBe(seating.visitId);
    });

    /**
     * The first acceptance criterion of the issue. Two phones, one party, one
     * bill - and the second guest reaches the first one's visit because
     * `TableState.visitId` is the only place to look.
     */
    it('puts two guests scanning one table into one visit', async () => {
      await seat();

      const first = await started(alice);
      const second = await started(bob);

      expect(second.session.visitId).toBe(first.session.visitId);
      expect(await readVisits()).toHaveLength(1);
    });

    it('writes one session per guest', async () => {
      await seat();
      await started(alice);
      await started(bob);

      expect((await readSessions()).map((s) => s['guestUserId'])).toEqual([
        ALICE,
        BOB,
      ]);
    });
  });

  describe('seating a table with guests already waiting', () => {
    /**
     * The confirmation staff give is the seating itself. A host who has just
     * sat a party down is not asked, one guest at a time, whether the people
     * they are looking at are really there.
     */
    it('activates every pending session onto the visit it opens', async () => {
      await started(alice);
      await started(bob);

      const seating = await seat();

      for (const guest of [alice, bob]) {
        expect(await readSession(guest)).toMatchObject({
          status: 'active',
          visitId: seating.visitId,
        });
      }
    });

    /**
     * The wait must not count against the idle timeout. A party activated at
     * the moment they sat down with a `lastActiveAt` from when they scanned
     * outside would be minutes closer to expiring than one that never scanned.
     */
    it('restarts the idle clock at the moment of seating', async () => {
      const { session } = await started(alice);
      const seating = await seat();
      const activated = await readSession(alice);

      expect(activated?.['lastActiveAt']).toBe(seating.since);
      expect(activated?.['startedAt']).toBe(session.startedAt);
    });

    /**
     * The sticker photographed at lunch and scanned at home. Admitting it to
     * the evening's party would attach a stranger to somebody else's bill.
     */
    it('expires a pending session that went idle instead of activating it', async () => {
      await setIdleTimeout(30);
      await started(alice);
      await goIdle(Date.now(), 90);

      await seat();

      expect(await readSession(alice)).toMatchObject({ status: 'expired' });
      expect(await readSession(alice)).not.toHaveProperty('visitId');
    });

    it('leaves a session at another table alone', async () => {
      await started(alice, TOKEN_TABLE_5);
      await seat(TABLE_12);

      expect(await readSession(alice, TABLE_5)).toMatchObject({
        status: 'pending',
      });
    });
  });

  describe('ending the visit', () => {
    it('closes every session it carried', async () => {
      await seat();
      await started(alice);
      await started(bob);

      const ending = await free();

      for (const guest of [alice, bob]) {
        expect(await readSession(guest)).toMatchObject({
          status: 'closed',
          endedAt: ending.since,
        });
      }
    });

    /**
     * "A guest cannot join a closed visit", and it is unreachable rather than
     * refused: ending the visit dropped the pointer, so a scan afterwards finds
     * no open visit and starts a new pending session. That is the honest
     * description of the party that came back for a coffee.
     */
    it('gives a guest scanning afterwards a new pending session', async () => {
      const seating = await seat();
      await started(alice);
      await free();

      const again = await started(alice);

      expect(again.status).toBe('pending');
      expect(again.session.visitId).toBeUndefined();
      expect(
        (await readVisits()).filter((visit) => visit['id'] === seating.visitId),
      ).toMatchObject([{ status: 'closed' }]);
    });

    /**
     * A visit that moved tables keeps its sessions, because the sync looks for
     * them by visit rather than by table - the visit is the identity that
     * survives a move, which is the whole reason orders hang from it.
     */
    it('closes sessions of a party that never moved, by visit', async () => {
      await seat();
      await started(alice);

      await free();

      expect(await readSession(alice)).toMatchObject({ status: 'closed' });
    });
  });

  describe('scanning the same code again', () => {
    it('addresses one session rather than opening a second', async () => {
      await started(alice);
      await started(alice);

      expect(await readSessions()).toHaveLength(1);
    });

    it('keeps the original start and pushes the idle clock forward', async () => {
      const first = await started(alice);
      const second = await started(alice, TOKEN, later(10));

      expect(second.session.startedAt).toBe(first.session.startedAt);
      expect(second.session.lastActiveAt).toBe(later(10).getTime());
    });

    it('picks up the visit when the table was seated in between', async () => {
      await started(alice);
      const seating = await seat();

      expect((await started(alice)).session.visitId).toBe(seating.visitId);
    });

    /**
     * Ending is one-way. The guest who left and scanned again is starting
     * something new, so the replacement must not carry the `endedAt` or the
     * `visitId` of the meal that is over.
     */
    it('replaces an ended session rather than reviving it', async () => {
      await seat();
      await started(alice);
      await leave();
      await free();

      const again = await started(alice, TOKEN, later(1));

      expect(again.session.startedAt).toBe(later(1).getTime());
      expect(await readSession(alice)).not.toHaveProperty('endedAt');
      expect(await readSession(alice)).not.toHaveProperty('visitId');
    });

    /**
     * The flag is read off the token that is starting the session, not carried
     * forward - so a guest who registered between two scans stops being
     * recorded as anonymous, which is what "upgradeable without losing the
     * session" has to mean for the record as well as for the uid.
     */
    it('records the guest as a member once they have an account', async () => {
      await started(alice);

      expect((await started(member)).session.isAnonymousGuest).toBe(false);
      expect(await readSessions()).toHaveLength(1);
    });
  });

  describe('a session that went idle', () => {
    /**
     * Expiry is computed rather than swept, so an idle session is not rewritten
     * until somebody asks. What must not happen is that it is *resumed*: the
     * `startedAt` of a meal that is over would make the new one look hours old
     * on the staff screen, and the guest would be shown a duration they never
     * sat for.
     */
    it('starts afresh rather than resuming', async () => {
      await setIdleTimeout(30);
      const first = await started(alice);

      const again = await started(alice, TOKEN, later(90));

      expect(first.session.startedAt).toBe(LUNCHTIME.getTime());
      expect(again.session.startedAt).toBe(later(90).getTime());
    });

    /**
     * The same ninety minutes, against the two-hour default rather than a
     * configured half hour. The restaurant that has said nothing gets a timeout
     * longer than a meal, so a party mid-dinner is not told they have left.
     */
    it('resumes inside the default when the restaurant configured none', async () => {
      const first = await started(alice);

      expect((await started(alice, TOKEN, later(90))).session.startedAt).toBe(
        first.session.startedAt,
      );
    });
  });

  describe('leaving', () => {
    it('ends the caller and nobody else', async () => {
      await seat();
      await started(alice);
      await started(bob);

      const result = await leave(alice);

      expect(result.status).toBe('left');
      expect(await readSession(alice)).toMatchObject({
        status: 'left',
        endedAt: LUNCHTIME.getTime(),
      });
      expect(await readSession(bob)).toMatchObject({ status: 'active' });
    });

    /**
     * The party is the restaurant's to close. A guest who could end a visit by
     * tapping "leave" could clear a table they were never sitting at, since the
     * QR code never proved they were.
     */
    it('leaves the visit open and the table seated', async () => {
      const seating = await seat();
      await started(alice);

      await leave(alice);

      expect(await readVisits()).toMatchObject([{ status: 'open' }]);
      expect(
        (
          await restaurantRef().collection('tableStates').doc(TABLE_12).get()
        ).data(),
      ).toMatchObject({ status: 'occupied', visitId: seating.visitId });
    });

    it('keeps the visit the guest was in on the record', async () => {
      const seating = await seat();
      await started(alice);

      await leave(alice);

      expect(await readSession(alice)).toMatchObject({
        visitId: seating.visitId,
        startedAt: LUNCHTIME.getTime(),
      });
    });

    /**
     * A second tap is the same reply rather than an error. The guest asked for
     * an outcome they already have, and a screen apologising for it would be
     * apologising for nothing.
     */
    it('answers a session that already ended with what it is', async () => {
      await seat();
      await started(alice);
      await free();

      const result = await leave(alice);

      expect(result).toMatchObject({ status: 'closed', alreadyEnded: true });
    });

    it('refuses a table the guest never scanned', async () => {
      expect(await codeOf(leave(alice, TABLE_5))).toBe('not-found');
    });
  });

  describe('who may start one', () => {
    it('refuses a caller with no session at all', async () => {
      expect(
        await codeOf(
          startTableSessionHandler(
            {
              data: { token: TOKEN },
              rawRequest: { ip: '203.0.113.7' },
            } as never,
            LUNCHTIME,
          ),
        ),
      ).toBe('unauthenticated');
    });

    it('admits an anonymous one', async () => {
      expect((await started(alice)).session.isAnonymousGuest).toBe(true);
    });
  });

  /**
   * A scan can resolve and still not be orderable since issue #1102. A session
   * exists in order to place orders, so one at a restaurant that takes none is
   * a session that can never be used - and a row on a screen in a restaurant
   * that is not watching one.
   *
   * The client already knows, because the scan told it. These cover the backend
   * declining to take the client's word for it.
   */
  describe('a scan that resolves without ordering', () => {
    it('refuses a menu-only restaurant and writes nothing', async () => {
      await restaurantRef().update({ 'tableOrdering.enabled': false });

      const result = await start();

      expect(result).toEqual({
        ok: false,
        ordering: { available: false, reason: 'tableOrderingDisabled' },
      });
      expect(await readSessions()).toEqual([]);
    });

    it('refuses while the kitchen is paused, and says until when', async () => {
      const pausedUntilTimestamp = LUNCHTIME.getTime() + 20 * MINUTE;

      await restaurantRef().update({
        'tableOrdering.pausedUntilTimestamp': pausedUntilTimestamp,
      });

      expect(await start()).toEqual({
        ok: false,
        ordering: {
          available: false,
          reason: 'orderingPaused',
          pausedUntilTimestamp,
        },
      });
      expect(await readSessions()).toEqual([]);
    });

    /**
     * The case the guard is really for: the kitchen pauses while the guest is
     * reading the confirmation screen, so the resolution the client holds says
     * ordering was fine and the session must still be refused.
     */
    it('refuses a pause that began after the guest read the screen', async () => {
      const context = await started(alice);
      expect(context.status).toBe('pending');

      await restaurantRef().update({
        'tableOrdering.pausedUntilTimestamp': LUNCHTIME.getTime() + MINUTE,
      });

      expect(await start(bob)).toMatchObject({ ok: false });
      expect(await readSession(bob)).toBeUndefined();
    });
  });

  describe('a scan that does not resolve', () => {
    /**
     * Starting re-runs the ten checks rather than trusting the resolution the
     * client is holding, because a restaurant can close while the guest reads
     * the confirmation screen. Nothing is written when they fail.
     */
    it('refuses a token that resolves to nothing', async () => {
      expect((await refused(alice, 'ZZZZZZZZZZZZZZZZZZZZZZZZZZ')).reason).toBe(
        'unknownToken',
      );
    });

    it('refuses a missing token as a client error rather than a refusal', async () => {
      expect(
        await codeOf(
          startTableSessionHandler(guestRequest(alice, {}), LUNCHTIME),
        ),
      ).toBe('invalid-argument');
    });
  });
});
