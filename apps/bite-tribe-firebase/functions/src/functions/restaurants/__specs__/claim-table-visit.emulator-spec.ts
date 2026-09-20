import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentData,
  DocumentReference,
  getFirestore,
} from 'firebase-admin/firestore';
import { claimTableVisitFor } from '../claim-table-visit';
import { tableSessionId } from '../table-session';
import { TableVisitClaimResult } from '../table-visit-claim';

/**
 * Moving a meal onto the account the guest signed into, against the real
 * database (GitHub issue #1658).
 *
 * The emulator rather than a fake store, for the reason the specs beside it
 * give: every claim here is about one transaction that renames a document,
 * rewrites the orders hanging off it and leaves another party's dinner alone.
 * A mocked store would assert that the code called `set`, which was never the
 * part in doubt.
 *
 * The **proof** half - that the caller held the anonymous session, and that the
 * token it shows is an anonymous one - is `verifyIdToken` in the handler above
 * this function, and belongs to the Auth emulator rather than here. What this
 * pins down is what moves once that proof is in.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const GUEST = 'anonymous-guest-uid';
const MEMBER = 'member-uid';
const NEIGHBOUR = 'neighbour-guest-uid';

const RESTAURANT = 'claim-restaurant';
const TABLE_12 = 'table-12';
const VISIT = 'visit-1';
const OTHER_VISIT = 'visit-2';

const GUEST_SESSION = tableSessionId(TABLE_12, GUEST);
const MEMBER_SESSION = tableSessionId(TABLE_12, MEMBER);

const omitUndefined = (
  data: Record<string, unknown>,
): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  );

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

const sessionRef = (id: string): DocumentReference =>
  restaurantRef().collection('tableSessions').doc(id);

const orderRef = (id: string, visitId = VISIT): DocumentReference =>
  restaurantRef()
    .collection('visits')
    .doc(visitId)
    .collection('orders')
    .doc(id);

const assistanceRef = (id = 'callStaff-12'): DocumentReference =>
  restaurantRef().collection('assistanceRequests').doc(id);

const read = async (
  ref: DocumentReference,
): Promise<DocumentData | undefined> => (await ref.get()).data();

const claim = (): Promise<TableVisitClaimResult> =>
  claimTableVisitFor(MEMBER, RESTAURANT, TABLE_12, GUEST);

/**
 * A stored session. `visitId: undefined` in `fields` removes the field rather
 * than writing one: Firestore refuses an `undefined` value outright, which is
 * the same reason the merge deletes the key instead of assigning one.
 */
const session = (
  guestUserId: string,
  fields: Record<string, unknown> = {},
): Record<string, unknown> =>
  omitUndefined({
    id: tableSessionId(TABLE_12, guestUserId),
    restaurantId: RESTAURANT,
    tableId: TABLE_12,
    guestUserId,
    status: 'active',
    visitId: VISIT,
    startedAt: 1_000,
    lastActiveAt: 2_000,
    isAnonymousGuest: guestUserId !== MEMBER,
    ...fields,
  });

const order = (
  id: string,
  guestUserId: string,
  fields: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id,
  restaurantId: RESTAURANT,
  tableId: TABLE_12,
  visitId: VISIT,
  sessionId: tableSessionId(TABLE_12, guestUserId),
  guestUserId,
  status: 'submitted',
  currency: 'EUR',
  total: 12,
  lines: [
    {
      menuItemId: 'item-margherita',
      name: 'Margherita',
      price: 12,
      quantity: 1,
      currency: 'EUR',
    },
  ],
  submittedAt: 1_500,
  statusChangedAt: 1_500,
  ...fields,
});

const clear = async (): Promise<void> => {
  await getFirestore().recursiveDelete(restaurantRef());
};

describe('claiming a table visit', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error('claim specs require the Firestore emulator.');
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  afterAll(async () => {
    await clear();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  beforeEach(clear);

  describe('the ordinary claim', () => {
    beforeEach(async () => {
      await Promise.all([
        sessionRef(GUEST_SESSION).set(session(GUEST)),
        orderRef('req-1').set(order('req-1', GUEST)),
        orderRef('req-2').set(order('req-2', GUEST, { total: 24 })),
        orderRef('req-3').set(order('req-3', NEIGHBOUR)),
        assistanceRef().set({
          id: 'callStaff-12',
          restaurantId: RESTAURANT,
          tableId: TABLE_12,
          visitId: VISIT,
          kind: 'callStaff',
          status: 'open',
          requestedAt: 1_800,
          lastRequestedAt: 1_800,
          requestedByUserIds: [GUEST, NEIGHBOUR],
        }),
      ]);
    });

    it('moves the session, the orders and the signals to the signed-in account', async () => {
      const result = await claim();

      expect(result).toEqual({
        ok: true,
        sessionId: MEMBER_SESSION,
        visitId: VISIT,
        movedOrders: 2,
      });

      expect(await read(sessionRef(GUEST_SESSION))).toBeUndefined();
      expect(await read(sessionRef(MEMBER_SESSION))).toMatchObject({
        id: MEMBER_SESSION,
        guestUserId: MEMBER,
        status: 'active',
        visitId: VISIT,
        isAnonymousGuest: false,
      });

      expect(await read(orderRef('req-1'))).toMatchObject({
        guestUserId: MEMBER,
        sessionId: MEMBER_SESSION,
      });
      expect(await read(orderRef('req-2'))).toMatchObject({
        guestUserId: MEMBER,
        sessionId: MEMBER_SESSION,
      });

      // A waiter call the guest can no longer see is a call they make again.
      expect(await read(assistanceRef())).toMatchObject({
        requestedByUserIds: [NEIGHBOUR, MEMBER],
      });
    });

    /**
     * An order is immutable but for its status (`RD-TS-9`, `RD-TS-11`).
     * Reassignment changes whose it is and nothing the guest agreed to.
     */
    it('changes nothing else about an order', async () => {
      const before = await read(orderRef('req-1'));

      await claim();

      const after = await read(orderRef('req-1'));

      expect(after).toMatchObject({
        lines: before?.['lines'],
        total: before?.['total'],
        currency: before?.['currency'],
        status: before?.['status'],
        submittedAt: before?.['submittedAt'],
      });
    });

    /** The party at the next table is not part of this. */
    it('leaves another guest of the same visit alone', async () => {
      await claim();

      expect(await read(orderRef('req-3'))).toMatchObject({
        guestUserId: NEIGHBOUR,
        sessionId: tableSessionId(TABLE_12, NEIGHBOUR),
      });
    });
  });

  describe('when the account already sat at this table', () => {
    /** `RD-TS-42`: earliest arrival, latest activity, `active` over `pending`. */
    it('merges the two sessions', async () => {
      await Promise.all([
        sessionRef(GUEST_SESSION).set(
          session(GUEST, {
            status: 'active',
            startedAt: 900,
            lastActiveAt: 5_000,
          }),
        ),
        sessionRef(MEMBER_SESSION).set(
          session(MEMBER, {
            status: 'pending',
            startedAt: 100,
            lastActiveAt: 200,
          }),
        ),
        orderRef('req-1').set(order('req-1', GUEST)),
      ]);

      await expect(claim()).resolves.toMatchObject({
        ok: true,
        movedOrders: 1,
      });

      expect(await read(sessionRef(MEMBER_SESSION))).toMatchObject({
        status: 'active',
        startedAt: 100,
        lastActiveAt: 5_000,
        isAnonymousGuest: false,
      });
      expect(await read(sessionRef(GUEST_SESSION))).toBeUndefined();
    });

    /** A closed meal that happens to share a name is replaced, not merged. */
    it('replaces a session that had already ended', async () => {
      await Promise.all([
        sessionRef(GUEST_SESSION).set(session(GUEST, { visitId: OTHER_VISIT })),
        sessionRef(MEMBER_SESSION).set(
          session(MEMBER, { status: 'closed', endedAt: 500 }),
        ),
      ]);

      await expect(claim()).resolves.toMatchObject({ ok: true });

      const merged = await read(sessionRef(MEMBER_SESSION));

      expect(merged).toMatchObject({ status: 'active', visitId: OTHER_VISIT });
      expect(merged?.['endedAt']).toBeUndefined();
    });

    /**
     * Two live sessions in different visits. Merging them would move one
     * party's order list onto another party's table, so the caller is refused
     * and both sides are left exactly as they were.
     */
    it('refuses two live sessions sitting in different visits', async () => {
      await Promise.all([
        sessionRef(GUEST_SESSION).set(session(GUEST)),
        sessionRef(MEMBER_SESSION).set(
          session(MEMBER, { visitId: OTHER_VISIT }),
        ),
        orderRef('req-1').set(order('req-1', GUEST)),
      ]);

      await expect(claim()).resolves.toEqual({
        ok: false,
        reason: 'visitMismatch',
      });

      expect(await read(sessionRef(GUEST_SESSION))).toMatchObject({
        guestUserId: GUEST,
      });
      expect(await read(orderRef('req-1'))).toMatchObject({
        guestUserId: GUEST,
      });
    });
  });

  it('refuses a claim on a table with no such session', async () => {
    await expect(claim()).resolves.toEqual({
      ok: false,
      reason: 'sessionNotFound',
    });
  });

  /**
   * A session that never reached a visit - the guest scanned and staff have not
   * seated them yet. There is nothing to move but the session itself, and the
   * claim still has to work: the guest signed in while waiting.
   */
  it('claims a pending session with no visit and no orders', async () => {
    await sessionRef(GUEST_SESSION).set(
      session(GUEST, { status: 'pending', visitId: undefined }),
    );

    await expect(claim()).resolves.toEqual({
      ok: true,
      sessionId: MEMBER_SESSION,
      movedOrders: 0,
    });

    const claimed = await read(sessionRef(MEMBER_SESSION));

    expect(claimed).toMatchObject({ status: 'pending', guestUserId: MEMBER });
    expect(claimed?.['visitId']).toBeUndefined();
  });
});
