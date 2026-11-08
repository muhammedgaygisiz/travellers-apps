import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import {
  assignRestaurantOwnerHandler,
  revokeRestaurantOwnerHandler,
} from '../restaurant-ownership';

/**
 * Every account is a business account here: the role check reads the Auth
 * record, and this suite runs against the Firestore emulator alone.
 */
jest.mock('firebase-admin/auth', () => ({
  getAuth: (): unknown => ({
    getUser: async (): Promise<unknown> => ({
      customClaims: { roles: ['business'] },
    }),
  }),
}));

/**
 * More than one owner per restaurant against a real Firestore (epic #1614,
 * issue #1753).
 *
 * The unit spec drives the callables through a mocked transaction. This one
 * proves what only a real one can: that two operators assigning two accounts
 * at once both end up in the set, because the transaction that loses is
 * retried on top of the one that won.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';
const RESTAURANT = 'shared-restaurant';

const asOperator = <T>(data: T): CallableRequest<T> =>
  ({ auth: { uid: 'operator', token: { roles: ['admin'] } }, data }) as never;

const assign = (
  ownerUserId: string,
): ReturnType<typeof assignRestaurantOwnerHandler> =>
  assignRestaurantOwnerHandler(
    asOperator({ restaurantId: RESTAURANT, ownerUserId, reason: 'Verified.' }),
  );

const revoke = (
  ownerUserId: string,
): ReturnType<typeof revokeRestaurantOwnerHandler> =>
  revokeRestaurantOwnerHandler(
    asOperator({ restaurantId: RESTAURANT, ownerUserId, reason: 'Left.' }),
  );

const restaurant = async (): Promise<DocumentData | undefined> =>
  (await getFirestore().collection('restaurants').doc(RESTAURANT).get()).data();

const codeOf = async (call: Promise<unknown>): Promise<string> => {
  try {
    await call;
  } catch (error) {
    return (error as { code?: string }).code ?? String(error);
  }

  return 'no error';
};

describe('restaurant ownership with several owners', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'restaurant ownership specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    const db = getFirestore();

    await db.recursiveDelete(db.collection('restaurants'));
    await db.collection('restaurants').doc(RESTAURANT).set({ name: 'Shared' });
  });

  afterAll(async () => {
    const db = getFirestore();

    await db.recursiveDelete(db.collection('restaurants'));
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  it('adds a second owner and keeps the first grant', async () => {
    await assign('owner-a');
    const { claimedAtTimestamp } = (await restaurant()) ?? {};

    await assign('owner-b');

    expect(await restaurant()).toMatchObject({
      ownerUserIds: ['owner-a', 'owner-b'],
      claimStatus: 'claimed',
      claimedAtTimestamp,
    });
  });

  it('lands two concurrent assignments of different accounts', async () => {
    await Promise.all([assign('owner-a'), assign('owner-b')]);

    expect(((await restaurant())?.['ownerUserIds'] as string[]).sort()).toEqual(
      ['owner-a', 'owner-b'],
    );
  });

  it('returns already-assigned on a repeat and writes nothing', async () => {
    await assign('owner-a');
    const before = await restaurant();

    await expect(assign('owner-a')).resolves.toMatchObject({
      status: 'already-assigned',
    });
    expect(await restaurant()).toEqual(before);
  });

  it('refuses an eleventh owner and writes nothing', async () => {
    for (let index = 0; index < 10; index++) {
      await assign(`owner-${index}`);
    }
    const before = await restaurant();

    expect(await codeOf(assign('owner-10'))).toBe('failed-precondition');
    expect(await restaurant()).toEqual(before);
  });

  it('revokes one of two owners and leaves the other holding it', async () => {
    await assign('owner-a');
    await assign('owner-b');

    await revoke('owner-a');

    expect(await restaurant()).toMatchObject({
      ownerUserIds: ['owner-b'],
      claimStatus: 'claimed',
    });
  });

  it('revokes the last owner and leaves the restaurant revoked', async () => {
    await assign('owner-a');

    await revoke('owner-a');

    const data = await restaurant();
    expect(data).toMatchObject({ claimStatus: 'revoked' });
    expect(data).not.toHaveProperty('ownerUserIds');
    expect(data).not.toHaveProperty('ownerUserId');
    expect(data).not.toHaveProperty('claimedAt');
    expect(data).not.toHaveProperty('claimedAtTimestamp');
  });

  it('refuses revoking a non-member and writes nothing', async () => {
    await assign('owner-a');
    const before = await restaurant();

    expect(await codeOf(revoke('owner-b'))).toBe('failed-precondition');
    expect(await restaurant()).toEqual(before);
  });
});
