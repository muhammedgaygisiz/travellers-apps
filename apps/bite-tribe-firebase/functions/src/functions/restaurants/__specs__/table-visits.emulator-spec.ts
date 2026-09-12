import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import {
  MoveTableVisitResult,
  moveTableVisitHandler,
} from '../move-table-visit';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';

/**
 * Table visits against the real database (GitHub issue #1095).
 *
 * The emulator rather than a fake Firestore, because every claim the issue
 * makes is about several documents landing together or not at all: a visit and
 * the state that points at it, a move that rewrites two tables and one visit,
 * and two hosts seating one table producing one visit. A mocked store would
 * assert that the code called `create`, which was never the part in doubt - and
 * it could not run two transactions against one document at all, which is what
 * "a table has at most one open visit" rests on.
 *
 * The rules half - that no client may write a visit - is in
 * `src/firestore-rules/__specs__/firestore-rules.emulator-spec.ts`, which runs
 * with rules enabled. The Admin SDK bypasses rules, so it cannot be checked
 * from here.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const HOST = 'host-uid';
const SECOND_HOST = 'second-host-uid';

const RESTAURANT = 'owned-restaurant';
const DINING_ROOM = 'dining-room';

const TABLE_12 = 'table-12';
const TABLE_5 = 'table-5';
const RETIRED_TABLE = 'table-retired';
const UNPUBLISHED_TABLE = 'table-never-published';

interface Caller {
  uid: string;
  roles: string[];
}

const asOwner: Caller = { uid: OWNER, roles: ['business'] };
const asHost: Caller = { uid: HOST, roles: ['staff'] };
const asSecondHost: Caller = { uid: SECOND_HOST, roles: ['staff'] };

const request = (caller: Caller, data: Record<string, unknown>): never =>
  ({
    auth: { uid: caller.uid, token: { roles: caller.roles } },
    data,
  }) as never;

const transition = (
  tableId: string,
  to: string,
  from: string,
  caller: Caller = asHost,
  extra: Record<string, unknown> = {},
): Promise<TransitionTableStateResult> =>
  transitionTableStateHandler(
    request(caller, {
      restaurantId: RESTAURANT,
      tableId,
      status: to,
      expectedStatus: from,
      ...extra,
    }),
  );

/** The ordinary seating: a free table takes a party. */
const seat = (
  tableId = TABLE_12,
  extra: Record<string, unknown> = {},
  caller: Caller = asHost,
): Promise<TransitionTableStateResult> =>
  transition(tableId, 'occupied', 'available', caller, extra);

const moveVisit = (
  visitId: string,
  toTableId: string,
  expectedStatus = 'available',
  caller: Caller = asHost,
  extra: Record<string, unknown> = {},
): Promise<MoveTableVisitResult> =>
  moveTableVisitHandler(
    request(caller, {
      restaurantId: RESTAURANT,
      visitId,
      toTableId,
      expectedStatus,
      ...extra,
    }),
  );

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

const tableRef = (tableId: string): DocumentReference =>
  restaurantRef().collection('tables').doc(tableId);

const readState = async (
  tableId = TABLE_12,
): Promise<DocumentData | undefined> =>
  (await restaurantRef().collection('tableStates').doc(tableId).get()).data();

const readVisit = async (visitId: string): Promise<DocumentData | undefined> =>
  (await restaurantRef().collection('visits').doc(visitId).get()).data();

const readVisits = async (): Promise<DocumentData[]> => {
  const snapshot = await restaurantRef().collection('visits').get();

  return snapshot.docs
    .map((visit) => visit.data())
    .sort((left, right) => left['openedAt'] - right['openedAt']);
};

const readTransitions = async (): Promise<DocumentData[]> => {
  const snapshot = await restaurantRef()
    .collection('tableStateTransitions')
    .get();

  // By table as well as by instant: a move writes both of its entries with one
  // `at`, so an order that reads only the clock is not an order at all.
  return snapshot.docs
    .map((entry) => entry.data())
    .sort(
      (left, right) =>
        left['at'] - right['at'] ||
        String(left['tableId']).localeCompare(String(right['tableId'])),
    );
};

/** The error code an `HttpsError` carries, or the error itself if it is not one. */
const codeOf = async (call: Promise<unknown>): Promise<string> => {
  try {
    await call;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }

  return 'no error';
};

const table = (label: string, enabled = true): Record<string, unknown> => ({
  label,
  roomId: DINING_ROOM,
  position: { x: 2000, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled,
  shape: 'round',
  diameter: 900,
});

const seed = async (): Promise<void> => {
  const db = getFirestore();

  await restaurantRef().set({
    name: 'Owned Bistro',
    ownerUserId: OWNER,
    claimStatus: 'claimed',
  });

  await Promise.all([
    tableRef(TABLE_12).set(table('12')),
    tableRef(TABLE_5).set(table('5')),
    tableRef(RETIRED_TABLE).set(table('99', false)),
    db
      .collection('restaurantStaff')
      .doc(HOST)
      .set({ userId: HOST, restaurantId: RESTAURANT }),
    db
      .collection('restaurantStaff')
      .doc(SECOND_HOST)
      .set({ userId: SECOND_HOST, restaurantId: RESTAURANT }),
  ]);
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection('restaurantStaff')),
  ]);
};

describe('table visits', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table visit emulator specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await clear();
    await seed();
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  describe('opening a visit', () => {
    /**
     * Seating a table *is* opening a visit. Not two actions a host has to
     * remember to pair - one transition that writes the visit, the state and
     * the audit entry in one commit.
     */
    it('opens one when a table is seated', async () => {
      const result = await seat();

      expect(result.visitId).toBeTruthy();
      expect(result.visitStatus).toBe('open');
      expect(await readVisit(result.visitId ?? '')).toMatchObject({
        id: result.visitId,
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        status: 'open',
        openedAt: result.since,
        openedByUserId: HOST,
      });
    });

    it('points the table state at the visit it opened', async () => {
      const result = await seat();

      expect(await readState()).toMatchObject({
        status: 'occupied',
        visitId: result.visitId,
      });
    });

    it('records the party size when the host gives one', async () => {
      const result = await seat(TABLE_12, { guestCount: 4 });

      expect((await readVisit(result.visitId ?? ''))?.['guestCount']).toBe(4);
    });

    /**
     * A host tapping a table mid-rush has not been asked for a number, and
     * refusing the seating over it would cost more than the field is worth.
     */
    it('opens a visit for a host who did not record one', async () => {
      const result = await seat();

      expect(await readVisit(result.visitId ?? '')).not.toHaveProperty(
        'guestCount',
      );
    });

    it.each([0, -1, 2.5, '4', 500])(
      'refuses %p as a party size',
      async (guestCount) => {
        expect(await codeOf(seat(TABLE_12, { guestCount }))).toBe(
          'invalid-argument',
        );
        expect(await readVisits()).toEqual([]);
      },
    );

    /**
     * A held table has nobody sitting at it. A visit opened when the booking
     * was taken would have its `openedAt` an hour before the party walked in.
     */
    it('opens none when a table is only reserved', async () => {
      const result = await transition(TABLE_12, 'reserved', 'available');

      expect(result.visitId).toBeUndefined();
      expect(await readVisits()).toEqual([]);
    });

    it('opens one when the reserved party arrives', async () => {
      await transition(TABLE_12, 'reserved', 'available');
      const arrived = await transition(TABLE_12, 'occupied', 'reserved');

      expect(arrived.visitId).toBeTruthy();
      expect(await readVisits()).toHaveLength(1);
    });

    /**
     * The party sending the waiter away is not a new party. `ordering` back to
     * `occupied` carries the visit it already had rather than opening a second
     * one at the same table.
     */
    it('opens no second visit when a party goes back to occupied', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'ordering', 'occupied');
      const back = await transition(TABLE_12, 'occupied', 'ordering');

      expect(back.visitId).toBe(seated.visitId);
      expect(await readVisits()).toHaveLength(1);
    });

    it('carries the visit through ordering and the bill', async () => {
      const seated = await seat();

      const ordering = await transition(TABLE_12, 'ordering', 'occupied');
      const billed = await transition(TABLE_12, 'awaitingPayment', 'ordering');

      expect(ordering.visitId).toBe(seated.visitId);
      expect(billed.visitId).toBe(seated.visitId);
      expect((await readState())?.['visitId']).toBe(seated.visitId);
    });

    it('opens a separate visit per table', async () => {
      const twelve = await seat(TABLE_12);
      const five = await seat(TABLE_5);

      expect(twelve.visitId).not.toBe(five.visitId);
      expect((await readVisits()).map((visit) => visit['tableId'])).toEqual([
        TABLE_12,
        TABLE_5,
      ]);
    });

    it('refuses to seat a table the owner took out of service', async () => {
      expect(await codeOf(seat(RETIRED_TABLE))).toBe('failed-precondition');
      expect(await readVisits()).toEqual([]);
    });
  });

  /**
   * The acceptance criterion, and the reason it needs no uniqueness check. The
   * state's `visitId` is the only pointer at an open visit; it is written by the
   * commit that seats the table and dropped by the commit that frees it, so a
   * second visit at one table would take a second seating of a table that is
   * already `occupied` - which fails its `expectedStatus` check against the one
   * document both hosts contend on.
   */
  describe('the one open visit per table rule', () => {
    it('refuses the second of two hosts seating one table', async () => {
      await seat(TABLE_12, {}, asHost);

      expect(await codeOf(seat(TABLE_12, {}, asSecondHost))).toBe('aborted');
      expect(await readVisits()).toHaveLength(1);
    });

    it('lets the next party in once the first visit has ended', async () => {
      const first = await seat();

      await transition(TABLE_12, 'cleaning', 'occupied');
      await transition(TABLE_12, 'available', 'cleaning');
      const second = await seat();

      expect(second.visitId).not.toBe(first.visitId);
      expect(await readVisits()).toHaveLength(2);
    });

    /**
     * Two parties through one table, and never two open at once - checked after
     * every transition rather than at the end, because "one at a time" is a
     * claim about each moment and not about the total.
     */
    it('never has two open at once across a whole service', async () => {
      const openCount = async (): Promise<number> =>
        (await readVisits()).filter((visit) => visit['status'] === 'open')
          .length;

      const service: [string, string][] = [
        ['occupied', 'available'],
        ['ordering', 'occupied'],
        ['awaitingPayment', 'ordering'],
        ['cleaning', 'awaitingPayment'],
        ['available', 'cleaning'],
        ['occupied', 'available'],
        ['cleaning', 'occupied'],
      ];

      for (const [to, from] of service) {
        await transition(TABLE_12, to, from);

        expect(await openCount()).toBeLessThanOrEqual(1);
      }

      expect(await readVisits()).toHaveLength(2);
      expect(await openCount()).toBe(0);
    });

    /**
     * The pointer is present exactly while the table holds a party. A pointer
     * left on a freed table would have the live view opening a visit that ended;
     * a missing one on a seated table would have the next seating open a second.
     */
    it('points at the open visit only while there is one', async () => {
      const seated = await seat();

      expect((await readState())?.['visitId']).toBe(seated.visitId);

      await transition(TABLE_12, 'awaitingPayment', 'occupied');

      expect((await readState())?.['visitId']).toBe(seated.visitId);

      await transition(TABLE_12, 'cleaning', 'awaitingPayment');

      expect(await readState()).not.toHaveProperty('visitId');
    });
  });

  describe('ending a visit', () => {
    it('closes it when the table is turned over', async () => {
      const seated = await seat();

      const freed = await transition(TABLE_12, 'cleaning', 'occupied');

      expect(freed.visitId).toBe(seated.visitId);
      expect(freed.visitStatus).toBe('closed');
      expect(await readVisit(seated.visitId ?? '')).toMatchObject({
        status: 'closed',
        closedAt: freed.since,
        closedByUserId: HOST,
      });
    });

    /**
     * Closing keeps everything that makes the visit what it was and adds only
     * how and when it ended.
     */
    it('keeps what the visit was opened with', async () => {
      const seated = await seat(TABLE_12, { guestCount: 6 }, asOwner);

      await transition(TABLE_12, 'cleaning', 'occupied');

      expect(await readVisit(seated.visitId ?? '')).toMatchObject({
        id: seated.visitId,
        tableId: TABLE_12,
        openedAt: seated.since,
        openedByUserId: OWNER,
        guestCount: 6,
      });
    });

    it('closes a visit that reached the bill', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'awaitingPayment', 'occupied');
      const freed = await transition(TABLE_12, 'cleaning', 'awaitingPayment');

      expect(freed.visitStatus).toBe('closed');
      expect((await readVisit(seated.visitId ?? ''))?.['status']).toBe(
        'closed',
      );
    });

    it('records a walked-out party as abandoned when asked to', async () => {
      const seated = await seat();

      const freed = await transition(TABLE_12, 'cleaning', 'occupied', asHost, {
        visitOutcome: 'abandoned',
        reason: 'Party left without paying',
      });

      expect(freed.visitStatus).toBe('abandoned');
      expect((await readVisit(seated.visitId ?? ''))?.['status']).toBe(
        'abandoned',
      );
    });

    it('refuses an outcome that is not an ending', async () => {
      expect(
        await codeOf(
          transition(TABLE_12, 'occupied', 'available', asHost, {
            visitOutcome: 'open',
          }),
        ),
      ).toBe('invalid-argument');
    });

    it('drops the pointer from the table it freed', async () => {
      await seat();
      await transition(TABLE_12, 'cleaning', 'occupied');

      expect(await readState()).not.toHaveProperty('visitId');
    });

    /**
     * The acceptance criterion: "closing a visit sets the table to a state that
     * requires an explicit next action, so tables are not silently reused". The
     * matrix of issue #1091 allows `occupied -> available`, and it is right to,
     * for the table wrongly seated and immediately corrected. What it must not
     * be is how a real party ends, because the next party would get the table
     * with the last one's plates on it.
     */
    it('refuses to free a table with a party straight to available', async () => {
      const seated = await seat();

      expect(await codeOf(transition(TABLE_12, 'available', 'occupied'))).toBe(
        'failed-precondition',
      );
      expect((await readVisit(seated.visitId ?? ''))?.['status']).toBe('open');
      expect((await readState())?.['status']).toBe('occupied');
    });

    it('refuses the same shortcut from the bill', async () => {
      await seat();
      await transition(TABLE_12, 'awaitingPayment', 'occupied');

      expect(
        await codeOf(transition(TABLE_12, 'available', 'awaitingPayment')),
      ).toBe('failed-precondition');
    });

    /**
     * A table that never had a party is unaffected. The narrowing is about the
     * visit, not about the matrix.
     */
    it('still frees a table that has no visit', async () => {
      await restaurantRef().collection('tableStates').doc(TABLE_12).set({
        tableId: TABLE_12,
        restaurantId: RESTAURANT,
        status: 'occupied',
        since: Date.now(),
        updatedByUserId: HOST,
      });

      const freed = await transition(TABLE_12, 'available', 'occupied');

      expect(freed.visitId).toBeUndefined();
      expect((await readState())?.['status']).toBe('available');
    });

    it('ends a visit once and not twice', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'cleaning', 'occupied');
      const closedAt = (await readVisit(seated.visitId ?? ''))?.['closedAt'];

      await transition(TABLE_12, 'available', 'cleaning');

      expect((await readVisit(seated.visitId ?? ''))?.['closedAt']).toBe(
        closedAt,
      );
    });
  });

  describe('the audit trail', () => {
    /**
     * The entries carry the visit, which is what makes the trail the visit's
     * own history as well as the table's. No list of tables is copied onto the
     * visit, where it could disagree with the trail a disputed evening is read
     * from.
     */
    it('names the visit on every transition that touched it', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'ordering', 'occupied');
      await transition(TABLE_12, 'cleaning', 'ordering');

      expect(
        (await readTransitions()).map((entry) => entry['visitId']),
      ).toEqual([seated.visitId, seated.visitId, seated.visitId]);
    });

    it('names no visit on a transition that had none', async () => {
      await transition(TABLE_12, 'disabled', 'available');

      expect((await readTransitions())[0]).not.toHaveProperty('visitId');
    });
  });

  describe('moving a visit to another table', () => {
    it('keeps the visit and changes where it is sitting', async () => {
      const seated = await seat(TABLE_12, { guestCount: 4 });

      const moved = await moveVisit(seated.visitId ?? '', TABLE_5);

      expect(moved).toMatchObject({
        visitId: seated.visitId,
        fromTableId: TABLE_12,
        toTableId: TABLE_5,
        fromStatus: 'cleaning',
      });
      expect(await readVisit(seated.visitId ?? '')).toMatchObject({
        id: seated.visitId,
        tableId: TABLE_5,
        status: 'open',
        openedAt: seated.since,
        openedByUserId: HOST,
        guestCount: 4,
      });
      expect(await readVisits()).toHaveLength(1);
    });

    it('occupies the table it moved to and turns over the one it left', async () => {
      const seated = await seat();

      const moved = await moveVisit(seated.visitId ?? '', TABLE_5);

      expect(await readState(TABLE_5)).toMatchObject({
        status: 'occupied',
        visitId: seated.visitId,
        since: moved.since,
        updatedByUserId: HOST,
      });
      expect(await readState(TABLE_12)).toMatchObject({
        status: 'cleaning',
        since: moved.since,
      });
      expect(await readState(TABLE_12)).not.toHaveProperty('visitId');
    });

    it('writes one audit entry per table, both naming the visit', async () => {
      const seated = await seat();

      const moved = await moveVisit(seated.visitId ?? '', TABLE_5);
      const entries = await readTransitions();

      expect(moved.transitionIds).toHaveLength(2);
      expect(
        entries.map(
          (entry) => `${entry['tableId']}:${entry['from']}>${entry['to']}`,
        ),
      ).toEqual([
        `${TABLE_12}:available>occupied`,
        `${TABLE_12}:occupied>cleaning`,
        `${TABLE_5}:available>occupied`,
      ]);
      expect(
        entries.every((entry) => entry['visitId'] === seated.visitId),
      ).toBe(true);
    });

    /**
     * The visit's table history, read the way it is meant to be read: one
     * `where` on `visitId` over the append-only trail.
     */
    it('leaves the tables the party sat at readable from the trail', async () => {
      const seated = await seat();

      await moveVisit(seated.visitId ?? '', TABLE_5);

      const history = await restaurantRef()
        .collection('tableStateTransitions')
        .where('visitId', '==', seated.visitId)
        .get();

      expect(
        [
          ...new Set(history.docs.map((entry) => entry.data()['tableId'])),
        ].sort(),
      ).toEqual([TABLE_12, TABLE_5]);
    });

    it('moves a party that has already ordered', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'ordering', 'occupied');
      const moved = await moveVisit(seated.visitId ?? '', TABLE_5);

      expect(moved.fromStatus).toBe('cleaning');
      expect((await readVisit(seated.visitId ?? ''))?.['status']).toBe('open');
      expect((await readState(TABLE_5))?.['status']).toBe('occupied');
    });

    it('refuses to move a visit onto the table it is already at', async () => {
      const seated = await seat();

      expect(
        await codeOf(moveVisit(seated.visitId ?? '', TABLE_12, 'occupied')),
      ).toBe('failed-precondition');
    });

    it('refuses to move a visit that has ended', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'cleaning', 'occupied');

      expect(await codeOf(moveVisit(seated.visitId ?? '', TABLE_5))).toBe(
        'failed-precondition',
      );
      expect(await readState(TABLE_5)).toBeUndefined();
    });

    it('refuses a visit that does not exist', async () => {
      expect(await codeOf(moveVisit('no-such-visit', TABLE_5))).toBe(
        'not-found',
      );
    });

    it('refuses a table that is not in the published plan', async () => {
      const seated = await seat();

      expect(
        await codeOf(moveVisit(seated.visitId ?? '', UNPUBLISHED_TABLE)),
      ).toBe('not-found');
    });

    it('refuses a table the owner took out of service', async () => {
      const seated = await seat();

      expect(await codeOf(moveVisit(seated.visitId ?? '', RETIRED_TABLE))).toBe(
        'failed-precondition',
      );
    });

    it('refuses a destination that already has a party', async () => {
      const seated = await seat(TABLE_12);

      await seat(TABLE_5);

      expect(
        await codeOf(moveVisit(seated.visitId ?? '', TABLE_5, 'occupied')),
      ).toBe('failed-precondition');
      expect(await readVisits()).toHaveLength(2);
    });

    /**
     * The one the matrix does not catch. `ordering -> occupied` is legal - it is
     * a party sending the waiter away - so a second party walked onto a table
     * mid-order would overwrite its pointer and leave the first party's visit
     * unreachable, with the orders that hang from it.
     */
    it('refuses a destination whose party is mid-order', async () => {
      const seated = await seat(TABLE_12);
      const stranded = await seat(TABLE_5);

      await transition(TABLE_5, 'ordering', 'occupied');

      expect(
        await codeOf(moveVisit(seated.visitId ?? '', TABLE_5, 'ordering')),
      ).toBe('failed-precondition');
      expect((await readVisit(stranded.visitId ?? ''))?.['status']).toBe(
        'open',
      );
      expect((await readState(TABLE_5))?.['visitId']).toBe(stranded.visitId);
      expect((await readVisit(seated.visitId ?? ''))?.['tableId']).toBe(
        TABLE_12,
      );
    });

    it('tells the caller when the destination moved under it', async () => {
      const seated = await seat(TABLE_12);

      await transition(TABLE_5, 'cleaning', 'available');

      expect(await codeOf(moveVisit(seated.visitId ?? '', TABLE_5))).toBe(
        'aborted',
      );
    });

    it('refuses a destination that cannot take a party at all', async () => {
      const seated = await seat(TABLE_12);

      await transition(TABLE_5, 'cleaning', 'available');

      expect(
        await codeOf(moveVisit(seated.visitId ?? '', TABLE_5, 'cleaning')),
      ).toBe('failed-precondition');
    });

    it('lets a consumer account move nothing', async () => {
      const seated = await seat();

      expect(
        await codeOf(
          moveVisit(seated.visitId ?? '', TABLE_5, 'available', {
            uid: 'consumer-uid',
            roles: [],
          }),
        ),
      ).toBe('permission-denied');
    });
  });

  describe('a visit whose table is gone', () => {
    /**
     * The acceptance criterion: a visit survives the deletion of its table in
     * the floor plan, keeping the historical record readable. Visits live under
     * the restaurant and `tableId` is a plain string, so the record still names
     * a table nobody can find.
     */
    it('is still readable after the table is deleted', async () => {
      const seated = await seat();

      await transition(TABLE_12, 'cleaning', 'occupied');
      await tableRef(TABLE_12).delete();

      expect(await readVisit(seated.visitId ?? '')).toMatchObject({
        tableId: TABLE_12,
        status: 'closed',
        openedByUserId: HOST,
      });
      expect((await tableRef(TABLE_12).get()).exists).toBe(false);
    });

    /**
     * A party standing in the room is movable whatever the plan now says about
     * where it used to sit. The source state is only rewritten while it still
     * points at this visit.
     */
    it('can still be moved to a table that does exist', async () => {
      const seated = await seat();

      await restaurantRef().collection('tableStates').doc(TABLE_12).delete();
      await tableRef(TABLE_12).delete();

      const moved = await moveVisit(seated.visitId ?? '', TABLE_5);

      expect(moved.transitionIds).toHaveLength(1);
      expect(await readVisit(seated.visitId ?? '')).toMatchObject({
        id: seated.visitId,
        tableId: TABLE_5,
        status: 'open',
      });
      expect((await readState(TABLE_5))?.['visitId']).toBe(seated.visitId);
    });
  });
});
