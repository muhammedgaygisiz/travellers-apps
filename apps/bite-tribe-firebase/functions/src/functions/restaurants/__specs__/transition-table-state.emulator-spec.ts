import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import {
  TransitionTableStateResult,
  transitionTableStateHandler,
} from '../transition-table-state';

/**
 * Table state transitions against the real database (GitHub issue #1092).
 *
 * The emulator rather than a fake Firestore, because the claim this issue makes
 * is about what happens when two writers meet: that two staff members seating
 * one table produce one seating and one explicit conflict. A mocked store would
 * assert that the code called `set`, which was never the part in doubt - and it
 * could not run two transactions against one document at all, which is the only
 * thing worth testing here.
 *
 * The rules half - that no client may write a state document - is in
 * `src/firestore-rules/__specs__/firestore-rules.emulator-spec.ts`, which runs
 * with rules enabled. The Admin SDK bypasses rules, so it cannot be checked
 * from here.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const OTHER_BUSINESS = 'other-business-uid';
const OPERATOR = 'operator-uid';
const HOST = 'host-uid';
const SECOND_HOST = 'second-host-uid';
const FOREIGN_HOST = 'foreign-host-uid';

const RESTAURANT = 'owned-restaurant';
const FOREIGN_RESTAURANT = 'foreign-restaurant';
const DINING_ROOM = 'dining-room';

const TABLE_12 = 'table-12';
const TABLE_13 = 'table-13';
const RETIRED_TABLE = 'table-retired';
const UNPUBLISHED_TABLE = 'table-never-published';

interface Caller {
  uid: string;
  roles: string[];
}

const asOwner: Caller = { uid: OWNER, roles: ['business'] };
const asOtherBusiness: Caller = { uid: OTHER_BUSINESS, roles: ['business'] };
const asOperator: Caller = { uid: OPERATOR, roles: ['admin'] };
const asHost: Caller = { uid: HOST, roles: ['staff'] };
const asSecondHost: Caller = { uid: SECOND_HOST, roles: ['staff'] };
const asForeignHost: Caller = { uid: FOREIGN_HOST, roles: ['staff'] };
const asConsumer: Caller = { uid: 'consumer-uid', roles: [] };

const request = (caller: Caller, data: Record<string, unknown>): never =>
  ({
    auth: { uid: caller.uid, token: { roles: caller.roles } },
    data,
  }) as never;

const transition = (
  caller: Caller,
  data: Record<string, unknown>,
): Promise<TransitionTableStateResult> =>
  transitionTableStateHandler(request(caller, data));

/** The ordinary call: one table of the owned restaurant, by its host. */
const move = (
  to: string,
  from: string,
  caller: Caller = asHost,
  extra: Record<string, unknown> = {},
): Promise<TransitionTableStateResult> =>
  transition(caller, {
    restaurantId: RESTAURANT,
    tableId: TABLE_12,
    status: to,
    expectedStatus: from,
    ...extra,
  });

const restaurantRef = (restaurantId: string): DocumentReference =>
  getFirestore().collection('restaurants').doc(restaurantId);

const tableRef = (
  tableId: string,
  restaurantId = RESTAURANT,
): DocumentReference =>
  restaurantRef(restaurantId).collection('tables').doc(tableId);

const readState = async (
  tableId = TABLE_12,
  restaurantId = RESTAURANT,
): Promise<DocumentData | undefined> =>
  (
    await restaurantRef(restaurantId)
      .collection('tableStates')
      .doc(tableId)
      .get()
  ).data();

const readTransitions = async (
  restaurantId = RESTAURANT,
): Promise<DocumentData[]> => {
  const snapshot = await restaurantRef(restaurantId)
    .collection('tableStateTransitions')
    .get();

  return snapshot.docs
    .map((entry) => entry.data())
    .sort((left, right) => left['at'] - right['at']);
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

  await Promise.all([
    restaurantRef(RESTAURANT).set({
      name: 'Owned Bistro',
      ownerUserId: OWNER,
      claimStatus: 'claimed',
    }),
    restaurantRef(FOREIGN_RESTAURANT).set({
      name: 'Someone Else',
      ownerUserId: OTHER_BUSINESS,
    }),
  ]);

  await Promise.all([
    tableRef(TABLE_12).set(table('12')),
    tableRef(TABLE_13).set(table('13')),
    tableRef(RETIRED_TABLE).set(table('99', false)),
    tableRef(TABLE_12, FOREIGN_RESTAURANT).set(table('12')),
    db
      .collection('restaurantStaff')
      .doc(HOST)
      .set({ userId: HOST, restaurantId: RESTAURANT }),
    db
      .collection('restaurantStaff')
      .doc(SECOND_HOST)
      .set({ userId: SECOND_HOST, restaurantId: RESTAURANT }),
    db
      .collection('restaurantStaff')
      .doc(FOREIGN_HOST)
      .set({ userId: FOREIGN_HOST, restaurantId: FOREIGN_RESTAURANT }),
  ]);
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection('restaurantStaff')),
  ]);
};

describe('table state transitions', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table state emulator specs require the Firestore emulator.',
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

  describe('applying a transition', () => {
    /**
     * A table with no state document is `available`, so the first transition of
     * a restaurant's life sends `available` as what it saw and writes the state
     * document that did not exist. Nothing backfills one per table.
     */
    it('writes the first state of a table that never had one', async () => {
      const result = await move('occupied', 'available');

      expect(result).toMatchObject({
        restaurantId: RESTAURANT,
        tableId: TABLE_12,
        from: 'available',
        to: 'occupied',
      });
      expect(await readState()).toMatchObject({
        tableId: TABLE_12,
        restaurantId: RESTAURANT,
        status: 'occupied',
        since: result.since,
        updatedByUserId: HOST,
      });
    });

    it('carries a table through a whole service', async () => {
      await move('occupied', 'available');
      await move('ordering', 'occupied');
      await move('awaitingPayment', 'ordering');
      await move('cleaning', 'awaitingPayment');
      await move('available', 'cleaning');

      expect((await readState())?.['status']).toBe('available');
      expect(
        (await readTransitions()).map(
          (entry) => `${entry['from']}>${entry['to']}`,
        ),
      ).toEqual([
        'available>occupied',
        'occupied>ordering',
        'ordering>awaitingPayment',
        'awaitingPayment>cleaning',
        'cleaning>available',
      ]);
    });

    /**
     * `since` is the moment of the accepted transition and the `at` of the
     * entry written with it, so the duration on the staff view and the history
     * behind it cannot disagree about when the table changed.
     */
    it('stamps the state and its audit entry with one instant', async () => {
      const result = await move('cleaning', 'available');
      const [entry] = await readTransitions();

      expect((await readState())?.['since']).toBe(result.since);
      expect(entry['at']).toBe(result.since);
      expect(entry['atIso']).toBe(new Date(result.since).toISOString());
    });

    /**
     * The state document is replaced rather than merged, so it says what the
     * last transition said and cannot carry a note left on the table three
     * parties ago.
     */
    it('drops a note the next transition does not repeat', async () => {
      await move('disabled', 'available', asHost, { note: 'Wobbly leg' });

      expect((await readState())?.['note']).toBe('Wobbly leg');

      await move('available', 'disabled');

      expect((await readState())?.['note']).toBeUndefined();
    });

    it('leaves every other table of the restaurant alone', async () => {
      await move('occupied', 'available');

      expect(await readState(TABLE_13)).toBeUndefined();
    });

    /** The floor plan is never written by a state change. */
    it('writes no field of the table itself', async () => {
      const before = (await tableRef(TABLE_12).get()).data();

      await move('occupied', 'available');

      expect((await tableRef(TABLE_12).get()).data()).toEqual(before);
    });
  });

  describe('the audit trail', () => {
    it('attributes every change to the account that made it', async () => {
      await move('occupied', 'available', asHost);
      await move('cleaning', 'occupied', asSecondHost);
      await move('available', 'cleaning', asOwner);

      expect(
        (await readTransitions()).map((entry) => entry['actorUserId']),
      ).toEqual([HOST, SECOND_HOST, OWNER]);
    });

    /**
     * The roles as well as the account, because "who changed this" and "in what
     * capacity" are different questions when a host, an owner and a support
     * operator can all reach the same table.
     */
    it('records the capacity the actor acted in', async () => {
      await move('occupied', 'available', asHost);
      await move('cleaning', 'occupied', asOperator);

      expect(
        (await readTransitions()).map((entry) => entry['actorRoles']),
      ).toEqual([['staff'], ['admin']]);
    });

    it('records a reason when the caller gives one', async () => {
      await move('disabled', 'available', asHost, {
        reason: 'Broken chair, waiting on a replacement',
      });

      expect((await readTransitions())[0]['reason']).toBe(
        'Broken chair, waiting on a replacement',
      );
    });

    it('omits the reason rather than storing an empty one', async () => {
      await move('cleaning', 'available', asHost, { reason: '   ' });

      expect((await readTransitions())[0]).not.toHaveProperty('reason');
    });

    /** A refused transition is not a transition, so it leaves no entry. */
    it('appends nothing when the transition is rejected', async () => {
      await codeOf(move('ordering', 'cleaning'));

      expect(await readTransitions()).toEqual([]);
      expect(await readState()).toBeUndefined();
    });

    /**
     * The history outlives the table it is about. [[Table]] requires that
     * deleting a table does not destroy what references it, which is why the
     * entries sit under the restaurant rather than under the table's own state.
     */
    it('survives the deletion of the table it describes', async () => {
      await move('occupied', 'available');
      await tableRef(TABLE_12).delete();

      expect(await readTransitions()).toHaveLength(1);
    });
  });

  /**
   * The idempotency key behind the offline staff view (GitHub issue #1096).
   *
   * A host seats two tables in a basement dining room and the tablet sends
   * them again when the signal comes back. Without a key the backend cannot
   * tell the second attempt from a second seating, so two tables seated
   * offline would land as four transitions - and the extra two would be
   * refused as `occupied -> occupied`, which is a failure message for work
   * that succeeded.
   */
  describe('replaying a transition', () => {
    const KEY = 'a1b2c3d4-queued-seating';

    /** The claim, in the shape a test can fail. */
    it('applies a repeated request once and answers the same thing twice', async () => {
      const first = await move('occupied', 'available', asHost, {
        requestId: KEY,
      });
      const second = await move('occupied', 'available', asHost, {
        requestId: KEY,
      });

      expect(await readTransitions()).toHaveLength(1);
      expect(second).toMatchObject({
        from: 'available',
        to: 'occupied',
        since: first.since,
        transitionId: first.transitionId,
        replayed: true,
      });
      expect(first.replayed).toBeUndefined();
    });

    /**
     * A replay arrives after the world has moved on. The `expectedStatus` it
     * was queued with is long gone, and refusing it over that would be
     * refusing a transition that already happened.
     */
    it('answers a replay even after the table has moved on', async () => {
      const first = await move('occupied', 'available', asHost, {
        requestId: KEY,
      });
      await move('cleaning', 'occupied', asSecondHost);

      const replay = await move('occupied', 'available', asHost, {
        requestId: KEY,
      });

      expect(replay).toMatchObject({ replayed: true, since: first.since });
      // The colleague's transition stands: the replay wrote nothing.
      expect((await readState())?.['status']).toBe('cleaning');
      expect(await readTransitions()).toHaveLength(2);
    });

    /** And after the table has been deleted from the published plan. */
    it('answers a replay for a table that is no longer on the plan', async () => {
      await move('occupied', 'available', asHost, { requestId: KEY });
      await tableRef(TABLE_12).delete();

      expect(
        await move('occupied', 'available', asHost, { requestId: KEY }),
      ).toMatchObject({ replayed: true });
    });

    /**
     * Two tables seated offline are two transitions on reconnect, whichever
     * order the replays arrive in.
     */
    it('keeps two queued seatings to two transitions', async () => {
      const seat = (tableId: string, requestId: string): Promise<unknown> =>
        transition(asHost, {
          restaurantId: RESTAURANT,
          tableId,
          status: 'occupied',
          expectedStatus: 'available',
          requestId,
        });

      await seat(TABLE_12, 'queued-one');
      await seat(TABLE_13, 'queued-two');
      await seat(TABLE_12, 'queued-one');
      await seat(TABLE_13, 'queued-two');

      expect(await readTransitions()).toHaveLength(2);
    });

    /**
     * The entry carries the key as well as being named after it, so the trail
     * is readable without consulting document names.
     */
    it('records the key on the entry it wrote', async () => {
      const { transitionId } = await move('cleaning', 'available', asHost, {
        requestId: KEY,
      });

      expect(transitionId).toBe(`req-${KEY}`);
      expect((await readTransitions())[0]['requestId']).toBe(KEY);
    });

    /**
     * A key reused across tables is a client bug, and answering it with the
     * other table's transition would be worse than refusing: the caller would
     * take a seating of table 12 as a seating of table 13 and stop retrying
     * the one it actually meant.
     */
    it('refuses a key that already names another table', async () => {
      await move('occupied', 'available', asHost, { requestId: KEY });

      expect(
        await codeOf(
          transition(asHost, {
            restaurantId: RESTAURANT,
            tableId: TABLE_13,
            status: 'occupied',
            expectedStatus: 'available',
            requestId: KEY,
          }),
        ),
      ).toBe('failed-precondition');
    });

    /**
     * The key becomes a document name, so it is narrow rather than "any
     * string": a slash would address a subcollection and a long one is a way
     * to store data in a document name.
     */
    it.each([['no'], ['../escape'], ['has/slash'], [42], ['x'.repeat(129)]])(
      'refuses %p as a key',
      async (requestId) => {
        expect(
          await codeOf(move('occupied', 'available', asHost, { requestId })),
        ).toBe('invalid-argument');
      },
    );

    /** Every caller written before the key existed keeps working without one. */
    it('applies a transition that carries no key at all', async () => {
      await move('occupied', 'available');

      expect(await readTransitions()).toHaveLength(1);
      expect((await readTransitions())[0]).not.toHaveProperty('requestId');
    });

    /**
     * A replay of a seating names the visit the first attempt opened, rather
     * than opening a second one for the same party (issue #1095).
     */
    it('names the visit the first attempt opened', async () => {
      const first = await move('occupied', 'available', asHost, {
        requestId: KEY,
      });
      const replay = await move('occupied', 'available', asHost, {
        requestId: KEY,
      });

      expect(replay.visitId).toBe(first.visitId);
      expect(replay.visitStatus).toBe('open');
      expect(
        (await restaurantRef(RESTAURANT).collection('visits').get()).size,
      ).toBe(1);
    });

    /** And a replay of a freeing says how the visit ended, not the default. */
    it('answers a replayed freeing with the outcome it recorded', async () => {
      await move('occupied', 'available');

      const first = await move('cleaning', 'occupied', asHost, {
        requestId: KEY,
        visitOutcome: 'abandoned',
      });
      const replay = await move('cleaning', 'occupied', asHost, {
        requestId: KEY,
      });

      expect(replay).toMatchObject({
        visitId: first.visitId,
        visitStatus: 'abandoned',
        replayed: true,
      });
    });
  });

  describe('two staff acting at once', () => {
    /**
     * The loser of a race does not fail fast, and the wait is the Admin SDK's
     * rather than this callable's: a transaction whose reads were touched is
     * retried after a backoff that starts at a second, so the second attempt -
     * the one that reads the winner's state and reports the conflict - lands
     * about three seconds in. That is past Jest's five-second default once the
     * fixtures have been reseeded, so every race below says how long it is
     * allowed to take instead of failing as a timeout that looks like a
     * deadlock.
     */
    const RACE_TIMEOUT_MS = 30_000;

    /**
     * The acceptance criterion, issued in one tick against one table.
     *
     * Both hosts read `available` - neither table has a state document yet -
     * and both ask for `occupied`. Firestore retries the transaction whose
     * reads were touched before it committed, so the loser re-reads the state
     * the winner wrote, fails the `expectedStatus` check on the second pass and
     * is told `aborted`. One seating, one explicit conflict, and never two
     * parties at one table.
     */
    it(
      'produces one seating and one conflict',
      async () => {
        const [first, second] = await Promise.allSettled([
          move('occupied', 'available', asHost),
          move('occupied', 'available', asSecondHost),
        ]);

        const outcomes = [first.status, second.status].sort();

        expect(outcomes).toEqual(['fulfilled', 'rejected']);

        const rejected = (
          first.status === 'rejected' ? first : second
        ) as PromiseRejectedResult;

        expect(rejected.reason.code).toBe('aborted');
        expect((await readState())?.['status']).toBe('occupied');
        expect(await readTransitions()).toHaveLength(1);
      },
      RACE_TIMEOUT_MS,
    );

    /** Two different intentions race the same way: one lands, one is told. */
    it(
      'resolves a seating against a reservation to one outcome',
      async () => {
        const settled = await Promise.allSettled([
          move('occupied', 'available', asHost),
          move('reserved', 'available', asSecondHost),
        ]);

        expect(
          settled.filter((one) => one.status === 'fulfilled'),
        ).toHaveLength(1);
        expect(await readTransitions()).toHaveLength(1);
        expect((await readState())?.['status']).toBe(
          (await readTransitions())[0]['to'],
        );
      },
      RACE_TIMEOUT_MS,
    );

    /**
     * The conflict carries what the table holds now, so the live view can say
     * "someone else just seated this table" and stop offering the button that
     * failed rather than only reporting a failure.
     */
    it('tells the loser what the table holds and who changed it', async () => {
      await move('occupied', 'available', asHost);

      let details: Record<string, unknown> = {};

      try {
        await move('reserved', 'available', asSecondHost);
      } catch (error) {
        details = (error as { details: Record<string, unknown> }).details;
      }

      expect(details).toMatchObject({
        currentStatus: 'occupied',
        expectedStatus: 'available',
        updatedByUserId: HOST,
      });
    });

    /** Two staff acting on two tables is not a conflict at all. */
    it(
      'lets two tables be seated at once',
      async () => {
        const settled = await Promise.allSettled([
          transition(asHost, {
            restaurantId: RESTAURANT,
            tableId: TABLE_12,
            status: 'occupied',
            expectedStatus: 'available',
          }),
          transition(asSecondHost, {
            restaurantId: RESTAURANT,
            tableId: TABLE_13,
            status: 'occupied',
            expectedStatus: 'available',
          }),
        ]);

        expect(settled.map((one) => one.status)).toEqual([
          'fulfilled',
          'fulfilled',
        ]);
        expect(await readTransitions()).toHaveLength(2);
      },
      RACE_TIMEOUT_MS,
    );
  });

  describe('the transition matrix', () => {
    it('refuses a transition the matrix does not allow', async () => {
      await move('cleaning', 'available');

      expect(await codeOf(move('ordering', 'cleaning'))).toBe(
        'failed-precondition',
      );
      expect((await readState())?.['status']).toBe('cleaning');
    });

    /**
     * A status never lists itself. Re-applying the status a table already holds
     * would reset `since`, which is the clock the staff view is built to show,
     * so it is refused here and answered by the idempotency key of issue #1096.
     */
    it('refuses re-applying the status the table already holds', async () => {
      await move('occupied', 'available');

      expect(await codeOf(move('occupied', 'occupied'))).toBe(
        'failed-precondition',
      );
      expect(await readTransitions()).toHaveLength(1);
    });

    it('refuses a status this model does not know', async () => {
      expect(
        await codeOf(
          transition(asHost, {
            restaurantId: RESTAURANT,
            tableId: TABLE_12,
            status: 'having-a-lovely-time',
            expectedStatus: 'available',
          }),
        ),
      ).toBe('invalid-argument');
    });

    it('requires the caller to name the state it saw', async () => {
      expect(
        await codeOf(
          transition(asHost, {
            restaurantId: RESTAURANT,
            tableId: TABLE_12,
            status: 'occupied',
          }),
        ),
      ).toBe('invalid-argument');
    });
  });

  describe('the table', () => {
    it('refuses a table that does not exist', async () => {
      expect(
        await codeOf(
          transition(asHost, {
            restaurantId: RESTAURANT,
            tableId: UNPUBLISHED_TABLE,
            status: 'occupied',
            expectedStatus: 'available',
          }),
        ),
      ).toBe('not-found');
    });

    /**
     * An unpublished table has no document under `tables` at all - the editor
     * of issue #1088 keeps its work in a draft until the owner publishes - so
     * "not published" and "does not exist" are one answer rather than two.
     */
    it('refuses a table of another restaurant', async () => {
      expect(
        await codeOf(
          transition(asHost, {
            restaurantId: FOREIGN_RESTAURANT,
            tableId: TABLE_12,
            status: 'occupied',
            expectedStatus: 'available',
          }),
        ),
      ).toBe('permission-denied');
      expect(await readState(TABLE_12, FOREIGN_RESTAURANT)).toBeUndefined();
    });

    it('refuses a restaurant that does not exist', async () => {
      expect(
        await codeOf(
          transition(asOperator, {
            restaurantId: 'no-such-restaurant',
            tableId: TABLE_12,
            status: 'occupied',
            expectedStatus: 'available',
          }),
        ),
      ).toBe('not-found');
    });

    /** Disabling a table in the editor blocks seating, per issue #1071. */
    it('refuses to seat or reserve a table that is out of service', async () => {
      for (const status of ['occupied', 'reserved']) {
        expect(
          await codeOf(
            transition(asHost, {
              restaurantId: RESTAURANT,
              tableId: RETIRED_TABLE,
              status,
              expectedStatus: 'available',
            }),
          ),
        ).toBe('failed-precondition');
      }
    });

    /**
     * A party already seated when the owner takes the table out of service can
     * still be wound down, or the staff view would show a table it cannot
     * clear.
     */
    it('lets a table taken out of service mid-party be freed', async () => {
      await move('occupied', 'available');
      await tableRef(TABLE_12).update({ enabled: false });

      await move('awaitingPayment', 'occupied');
      await move('cleaning', 'awaitingPayment');
      await move('available', 'cleaning');

      expect((await readState())?.['status']).toBe('available');
    });
  });

  describe('who may change a table', () => {
    it('admits the host of this restaurant', async () => {
      await expect(
        move('occupied', 'available', asHost),
      ).resolves.toMatchObject({ to: 'occupied' });
    });

    it('admits the account the restaurant is assigned to', async () => {
      await expect(
        move('occupied', 'available', asOwner),
      ).resolves.toMatchObject({ to: 'occupied' });
    });

    /** The operator, by `RD-UR-6`, so a restaurant in trouble has a way back. */
    it('admits the operator', async () => {
      await expect(
        move('occupied', 'available', asOperator),
      ).resolves.toMatchObject({ to: 'occupied' });
    });

    /**
     * The acceptance criterion "a staff member of restaurant A cannot
     * transition a table of restaurant B". The role alone is never the key:
     * the association has to name this restaurant.
     */
    it('refuses staff of another restaurant', async () => {
      expect(await codeOf(move('occupied', 'available', asForeignHost))).toBe(
        'permission-denied',
      );
      expect(await readState()).toBeUndefined();
    });

    it('refuses a business account that does not hold this restaurant', async () => {
      expect(await codeOf(move('occupied', 'available', asOtherBusiness))).toBe(
        'permission-denied',
      );
    });

    it('refuses an account with no role at all', async () => {
      expect(await codeOf(move('occupied', 'available', asConsumer))).toBe(
        'permission-denied',
      );
    });

    it('refuses a request with no session', async () => {
      expect(
        await codeOf(
          transitionTableStateHandler({
            data: {
              restaurantId: RESTAURANT,
              tableId: TABLE_12,
              status: 'occupied',
              expectedStatus: 'available',
            },
          } as never),
        ),
      ).toBe('unauthenticated');
    });

    /**
     * The claim without the association is "some restaurant employs this
     * account", which says nothing about this one - the same pair `worksAt()`
     * in `firestore.rules` checks.
     */
    it('refuses a staff account taken off the restaurant since it signed in', async () => {
      await getFirestore().collection('restaurantStaff').doc(HOST).delete();

      expect(await codeOf(move('occupied', 'available', asHost))).toBe(
        'permission-denied',
      );
    });
  });
});
