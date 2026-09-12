import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import {
  DocumentReference,
  FieldValue,
  getFirestore,
} from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import { resetScanRateLimit } from '../../shared/utils/scan-rate-limit';
import { TABLE_TOKENS_COLLECTION } from '../table-qr-tokens';
import { TableScanRefused, TableScanResolved } from '../table-scan';
import {
  ResolveTableQrTokenRequest,
  resolveTableQrTokenHandler,
} from '../resolve-table-qr-token';

/**
 * Resolving a scanned table QR code against the real database
 * (GitHub issue #1100).
 *
 * The emulator rather than a fake Firestore, because every claim this issue
 * makes is about documents that exist, do not exist, or say something the
 * caller did not write: a table removed from the published plan, a token the
 * rotation superseded, a restaurant whose assignment was revoked. A mocked
 * store would assert that the code called `get` - which was never in doubt -
 * and would let the six checks be satisfied by six stubs in the order the
 * implementation happened to call them.
 *
 * The issue asks for a passing negative test per validation rule, and that is
 * what `refusals` below is: one `it` per reason, each starting from a scan that
 * would otherwise resolve and breaking exactly one thing.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const OWNER = 'restaurant-owner-uid';
const RESTAURANT = 'owned-restaurant';
const DINING_ROOM = 'dining-room';
const TABLE_12 = 'table-12';
const MENU = 'menu-1';

const TOKEN = 'ABCDEFGHJKMNPQRSTVWXYZ0123';
const SUPERSEDED_TOKEN = '0123456789ABCDEFGHJKMNPQRS';

/** Wednesday 2026-09-16, 12:00 in Berlin. */
const LUNCHTIME = new Date('2026-09-16T10:00:00Z');

const request = (token: unknown): CallableRequest<ResolveTableQrTokenRequest> =>
  ({ data: { token }, rawRequest: { ip: '203.0.113.7' } }) as never;

const resolve = (token: unknown, now = LUNCHTIME): Promise<unknown> =>
  resolveTableQrTokenHandler(request(token), now);

const resolved = async (token = TOKEN): Promise<TableScanResolved> =>
  (await resolve(token)) as TableScanResolved;

const refused = async (
  token = TOKEN,
  now = LUNCHTIME,
): Promise<TableScanRefused> => (await resolve(token, now)) as TableScanRefused;

const restaurantRef = (): DocumentReference =>
  getFirestore().collection('restaurants').doc(RESTAURANT);

const seed = async (): Promise<void> => {
  const db = getFirestore();

  await restaurantRef().set({
    name: 'Owned Bistro',
    image: 'https://example.test/bistro.jpg',
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

  await restaurantRef()
    .collection('rooms')
    .doc(DINING_ROOM)
    .set({
      id: DINING_ROOM,
      name: 'Main dining room',
      order: 0,
      size: { width: 8000, height: 6000 },
      objects: [],
      version: 1,
    });

  await restaurantRef()
    .collection('tables')
    .doc(TABLE_12)
    .set({
      id: TABLE_12,
      label: '12',
      roomId: DINING_ROOM,
      position: { x: 2000, y: 3000 },
      rotation: 0,
      seats: 4,
      enabled: true,
      shape: 'round',
      diameter: 900,
      qrTokenId: TOKEN,
    });

  await db
    .collection('menus')
    .doc(MENU)
    .set({
      id: MENU,
      restaurantId: RESTAURANT,
      categories: [
        {
          id: 'category-pizza',
          title: 'Pizza',
          items: [
            {
              id: 'item-margherita',
              name: 'Margherita',
              description: 'Tomato, mozzarella, basil',
              price: 12,
            },
          ],
        },
      ],
    });

  await db
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
    });

  await db
    .collection(TABLE_TOKENS_COLLECTION)
    .doc(SUPERSEDED_TOKEN)
    .set({
      restaurantId: RESTAURANT,
      roomId: DINING_ROOM,
      tableId: TABLE_12,
      tableLabel: '12',
      tableEnabled: true,
      status: 'superseded',
      supersededBy: TOKEN,
      issuedAt: '2026-08-01T09:00:00.000Z',
      issuedAtTimestamp: Date.parse('2026-08-01T09:00:00.000Z'),
    });
};

const clear = async (): Promise<void> => {
  const db = getFirestore();

  await Promise.all([
    db.recursiveDelete(db.collection('restaurants')),
    db.recursiveDelete(db.collection('menus')),
    db.recursiveDelete(db.collection(TABLE_TOKENS_COLLECTION)),
  ]);
};

describe('resolve table QR token', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'table QR scan emulator specs require the Firestore emulator.',
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

  describe('a good scan', () => {
    it('resolves to exactly one restaurant, room, table and menu', async () => {
      expect(await resolved()).toEqual({
        ok: true,
        token: TOKEN,
        restaurant: {
          id: RESTAURANT,
          name: 'Owned Bistro',
          image: 'https://example.test/bistro.jpg',
        },
        room: { id: DINING_ROOM, name: 'Main dining room' },
        table: { id: TABLE_12, label: '12', seats: 4 },
        menu: { id: MENU },
      });
    });

    /**
     * The acceptance criterion that the response contains no data the guest
     * should not see, asserted against the fields rather than against a
     * promise. `ownerUserId` is on the restaurant document this answer was
     * built from, and the table document carries the geometry of a floor plan.
     */
    it('carries no ownership, no geometry and no other table', async () => {
      const context = await resolved();
      const serialized = JSON.stringify(context);

      expect(serialized).not.toContain(OWNER);
      expect(serialized).not.toContain('ownerUserId');
      expect(serialized).not.toContain('position');
      expect(serialized).not.toContain('claimStatus');
      expect(Object.keys(context.table).sort()).toEqual([
        'id',
        'label',
        'seats',
      ]);
    });

    /** A code typed off the sheet rather than scanned. */
    it('accepts the token in lower case', async () => {
      expect((await resolved(TOKEN.toLowerCase())).ok).toBe(true);
    });

    it('leaves the room name out when the room has been deleted', async () => {
      await restaurantRef().collection('rooms').doc(DINING_ROOM).delete();

      expect((await resolved()).room).toEqual({ id: DINING_ROOM });
    });

    /** A missing room is not a refusal: the guest is still at the table. */
    it('still resolves when the token names no room', async () => {
      await getFirestore()
        .collection(TABLE_TOKENS_COLLECTION)
        .doc(TOKEN)
        .update({ roomId: '' });

      const context = await resolved();

      expect(context.ok).toBe(true);
      expect(context.room).toEqual({ id: '' });
    });
  });

  /**
   * One negative case per validation rule, each breaking exactly one thing
   * about a scan that otherwise resolves.
   */
  describe('refusals', () => {
    it('refuses a token that does not exist', async () => {
      expect(await refused('ZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toEqual({
        ok: false,
        reason: 'unknownToken',
        nextStep: 'askStaff',
      });
    });

    it('refuses a token that is not shaped like one, without a read', async () => {
      expect(await refused('not-a-token')).toMatchObject({
        reason: 'unknownToken',
      });
    });

    /**
     * The Admin SDK throws on an empty document path, so a token document that
     * lost a field has to be refused before the read rather than after it.
     * Nothing writes one - the fields are set together with the token - which is
     * exactly why the branch needs a test of its own.
     */
    it('refuses a token document that names no restaurant', async () => {
      await getFirestore()
        .collection(TABLE_TOKENS_COLLECTION)
        .doc(TOKEN)
        .update({ restaurantId: '' });

      expect(await refused()).toMatchObject({ reason: 'restaurantNotFound' });
    });

    it('refuses a token document that names no table', async () => {
      await getFirestore()
        .collection(TABLE_TOKENS_COLLECTION)
        .doc(TOKEN)
        .update({ tableId: '' });

      expect(await refused()).toMatchObject({ reason: 'tableNotFound' });
    });

    it('refuses a token whose restaurant is gone', async () => {
      await restaurantRef().delete();

      expect(await refused()).toMatchObject({
        reason: 'restaurantNotFound',
        nextStep: 'askStaff',
      });
    });

    /**
     * "Active" is not a field: a restaurant is active while a business account
     * holds it, and a revoked assignment is exactly a restaurant that used to
     * be able to take an order and no longer can. `revokeRestaurantOwner`
     * deletes `ownerUserId` and writes `claimStatus: 'revoked'`, so the state
     * this asserts against is the one that callable leaves behind.
     */
    it('refuses a restaurant whose assignment was revoked', async () => {
      await restaurantRef().update({
        ownerUserId: FieldValue.delete(),
        claimStatus: 'revoked',
      });

      expect(await refused()).toMatchObject({
        reason: 'restaurantInactive',
        nextStep: 'askStaff',
      });
    });

    it('refuses a restaurant nobody has ever held', async () => {
      await restaurantRef().update({ ownerUserId: FieldValue.delete() });

      expect(await refused()).toMatchObject({
        reason: 'restaurantInactive',
      });
    });

    it('refuses a restaurant that does not offer ordering at the table', async () => {
      await restaurantRef().update({
        tableOrdering: { enabled: false, timeZone: 'Europe/Berlin' },
      });

      expect(await refused()).toMatchObject({
        reason: 'tableOrderingDisabled',
        nextStep: 'askStaff',
      });
    });

    /** A restaurant that has never been asked is not opted in. */
    it('refuses a restaurant with no table-ordering settings at all', async () => {
      await restaurantRef().set(
        { name: 'Owned Bistro', ownerUserId: OWNER, menuId: MENU },
        { merge: false },
      );

      expect(await refused()).toMatchObject({
        reason: 'tableOrderingDisabled',
      });
    });

    /**
     * The published `tables` collection is what "is published" means. A table
     * removed from the plan and a table that only ever existed in a draft read
     * the same here, and mean the same thing to the guest.
     */
    it('refuses a table that is not in the published plan', async () => {
      await restaurantRef().collection('tables').doc(TABLE_12).delete();

      expect(await refused()).toMatchObject({
        reason: 'tableNotFound',
        nextStep: 'askStaff',
      });
    });

    it('refuses a table the owner has taken out of service', async () => {
      await restaurantRef()
        .collection('tables')
        .doc(TABLE_12)
        .update({ enabled: false });

      expect(await refused()).toMatchObject({
        reason: 'tableDisabled',
        nextStep: 'askStaff',
      });
    });

    /** The one refusal whose next step is to look at the table again. */
    it('refuses a superseded token and sends the guest back to the table', async () => {
      expect(await refused(SUPERSEDED_TOKEN)).toEqual({
        ok: false,
        reason: 'tokenSuperseded',
        nextStep: 'rescanCode',
      });
    });

    it('refuses a revoked token', async () => {
      await getFirestore()
        .collection(TABLE_TOKENS_COLLECTION)
        .doc(TOKEN)
        .update({ status: 'revoked' });

      expect(await refused()).toMatchObject({
        reason: 'tokenRevoked',
        nextStep: 'askStaff',
      });
    });

    it('refuses while staff have paused new orders, and says until when', async () => {
      const pausedUntilTimestamp = LUNCHTIME.getTime() + 20 * 60_000;

      await restaurantRef().update({
        tableOrdering: {
          enabled: true,
          timeZone: 'Europe/Berlin',
          pausedUntilTimestamp,
        },
      });

      expect(await refused()).toEqual({
        ok: false,
        reason: 'orderingPaused',
        nextStep: 'tryLater',
        pausedUntilTimestamp,
      });
    });

    it('resolves again once the pause has lapsed', async () => {
      await restaurantRef().update({
        tableOrdering: {
          enabled: true,
          timeZone: 'Europe/Berlin',
          pausedUntilTimestamp: LUNCHTIME.getTime() - 1,
        },
      });

      expect((await resolved()).ok).toBe(true);
    });

    it('refuses outside opening hours, and names the next opening', async () => {
      /** 09:00 Berlin, before the 11:30 service. */
      const morning = new Date('2026-09-16T07:00:00Z');

      expect(await refused(TOKEN, morning)).toEqual({
        ok: false,
        reason: 'restaurantClosed',
        nextStep: 'tryLater',
        reopensAt: { day: 'wednesday', time: '11:30' },
      });
    });

    it('refuses a restaurant with no menu', async () => {
      await restaurantRef().update({ menuId: '' });

      expect(await refused()).toMatchObject({
        reason: 'menuMissing',
        nextStep: 'askStaff',
      });
    });

    it('refuses a menu document that has been deleted', async () => {
      await getFirestore().collection('menus').doc(MENU).delete();

      expect(await refused()).toMatchObject({ reason: 'menuMissing' });
    });

    it('refuses a menu with nothing that can be ordered today', async () => {
      await getFirestore()
        .collection('menus')
        .doc(MENU)
        .update({
          categories: [
            {
              id: 'category-pizza',
              title: 'Pizza',
              items: [
                {
                  id: 'item-margherita',
                  name: 'Margherita',
                  description: '',
                  price: 12,
                  isAvailable: false,
                },
              ],
            },
          ],
        });

      expect(await refused()).toMatchObject({
        reason: 'menuUnavailable',
        nextStep: 'askStaff',
      });
    });
  });

  /**
   * Several rules are false at once often enough to matter, and the guest gets
   * one sentence. Which one is a decision, not an accident of nesting.
   */
  describe('the order of the checks', () => {
    it('names the restaurant before the table when both are wrong', async () => {
      await restaurantRef().update({
        ownerUserId: FieldValue.delete(),
        claimStatus: 'revoked',
      });
      await restaurantRef().collection('tables').doc(TABLE_12).delete();

      expect(await refused()).toMatchObject({ reason: 'restaurantInactive' });
    });

    it('names the retired table before the code that was replaced', async () => {
      await restaurantRef()
        .collection('tables')
        .doc(TABLE_12)
        .update({ enabled: false });

      expect(await refused(SUPERSEDED_TOKEN)).toMatchObject({
        reason: 'tableDisabled',
      });
    });
  });

  describe('rate limiting', () => {
    it('refuses a caller that hammers one token', async () => {
      const scan = (): Promise<unknown> => resolve(TOKEN);

      for (let attempt = 0; attempt < 30; attempt++) {
        await scan();
      }

      await expect(scan()).rejects.toThrow(/Too many scans/);
    });
  });

  describe('the request itself', () => {
    it('refuses a call with no token', async () => {
      await expect(resolve(undefined)).rejects.toThrow(/token is required/);
      await expect(resolve('   ')).rejects.toThrow(/token is required/);
    });
  });
});
