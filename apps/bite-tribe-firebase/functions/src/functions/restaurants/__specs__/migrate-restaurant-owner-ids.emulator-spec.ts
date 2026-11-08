import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentData, getFirestore } from 'firebase-admin/firestore';
import { CallableRequest } from 'firebase-functions/https';
import {
  migrateRestaurantOwnerIds,
  migrateRestaurantOwnerIdsHandler,
} from '../migrate-restaurant-owner-ids';

/**
 * The `restaurant-owner-ids` migration against a real Firestore (epic #1614,
 * issue #1752).
 *
 * The emulator rather than the in-memory fake, because the migration decides
 * inside a transaction per restaurant and the fake has no transactions - and
 * because `FieldValue.delete()` beside a written array is the exact write
 * whose result matters here.
 */
const PROJECT_ID = 'bite-tribe-emulator-tests';

const restaurants = (): FirebaseFirestore.CollectionReference =>
  getFirestore().collection('restaurants');

const seed = (id: string, data: DocumentData): Promise<unknown> =>
  restaurants()
    .doc(id)
    .set({ name: id, ...data });

const read = async (id: string): Promise<DocumentData | undefined> =>
  (await restaurants().doc(id).get()).data();

const asCaller = (roles: string[]): CallableRequest<void> =>
  ({ auth: { uid: 'caller', token: { roles } }, data: undefined }) as never;

describe('migrateRestaurantOwnerIds', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'restaurant owner migration specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await getFirestore().recursiveDelete(restaurants());
  });

  afterAll(async () => {
    await getFirestore().recursiveDelete(restaurants());
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  it('moves every single owner into the set and removes the single field', async () => {
    await seed('held-a', {
      ownerUserId: 'owner-a',
      claimStatus: 'claimed',
      claimedAt: '2026-01-01T00:00:00.000Z',
      claimedAtTimestamp: 1767225600000,
    });
    await seed('held-b', { ownerUserId: 'owner-b', claimStatus: 'claimed' });
    await seed('unheld', {});

    const result = await migrateRestaurantOwnerIds();

    expect(result).toEqual({
      processed: 3,
      migrated: 2,
      skipped: 1,
      conflicting: 0,
      conflicts: [],
    });
    expect(await read('held-a')).toEqual({
      name: 'held-a',
      ownerUserIds: ['owner-a'],
      claimStatus: 'claimed',
      claimedAt: '2026-01-01T00:00:00.000Z',
      claimedAtTimestamp: 1767225600000,
    });
    expect(await read('held-b')).toMatchObject({ ownerUserIds: ['owner-b'] });
    expect(await read('held-b')).not.toHaveProperty('ownerUserId');
    expect(await read('unheld')).toEqual({ name: 'unheld' });
  });

  it('changes nothing on a second run and reports every restaurant as skipped', async () => {
    await seed('held-a', { ownerUserId: 'owner-a', claimStatus: 'claimed' });
    await seed('unheld', {});
    await migrateRestaurantOwnerIds();
    const before = await read('held-a');

    const result = await migrateRestaurantOwnerIds();

    expect(result).toEqual({
      processed: 2,
      migrated: 0,
      skipped: 2,
      conflicting: 0,
      conflicts: [],
    });
    expect(await read('held-a')).toEqual(before);
  });

  it('skips a restaurant already in the new shape', async () => {
    await seed('migrated', { ownerUserIds: ['owner-a'] });

    expect(await migrateRestaurantOwnerIds()).toMatchObject({
      migrated: 0,
      skipped: 1,
    });
    expect(await read('migrated')).toEqual({
      name: 'migrated',
      ownerUserIds: ['owner-a'],
    });
  });

  it('drops a single field the set already contains', async () => {
    await seed('both', { ownerUserId: 'owner-a', ownerUserIds: ['owner-a'] });

    expect(await migrateRestaurantOwnerIds()).toMatchObject({ migrated: 1 });
    expect(await read('both')).toEqual({
      name: 'both',
      ownerUserIds: ['owner-a'],
    });
  });

  it('drops an empty single field without inventing an owner', async () => {
    await seed('blank', { ownerUserId: '', claimStatus: 'revoked' });

    expect(await migrateRestaurantOwnerIds()).toMatchObject({ migrated: 1 });
    expect(await read('blank')).toEqual({
      name: 'blank',
      claimStatus: 'revoked',
    });
  });

  it('reports a restaurant whose two fields disagree and leaves it unchanged', async () => {
    await seed('conflict', {
      ownerUserId: 'owner-a',
      ownerUserIds: ['owner-b'],
    });
    await seed('held', { ownerUserId: 'owner-c' });

    const result = await migrateRestaurantOwnerIds();

    expect(result).toEqual({
      processed: 2,
      migrated: 1,
      skipped: 0,
      conflicting: 1,
      conflicts: ['conflict'],
    });
    expect(await read('conflict')).toEqual({
      name: 'conflict',
      ownerUserId: 'owner-a',
      ownerUserIds: ['owner-b'],
    });
  });

  it('reports a malformed set as conflicting', async () => {
    await seed('malformed', { ownerUserId: 'owner-a', ownerUserIds: 'x' });

    expect(await migrateRestaurantOwnerIds()).toMatchObject({
      conflicting: 1,
      conflicts: ['malformed'],
    });
  });

  it('leaves no restaurant carrying ownerUserId except the conflicting ones', async () => {
    await seed('a', { ownerUserId: 'owner-a' });
    await seed('b', { ownerUserId: 'owner-b', ownerUserIds: [] });
    await seed('c', { ownerUserId: '' });

    await migrateRestaurantOwnerIds();

    const remaining = await restaurants()
      .where('ownerUserId', '!=', null)
      .get();
    expect(remaining.size).toBe(0);
    expect(await read('b')).toMatchObject({ ownerUserIds: ['owner-b'] });
  });

  it.each([[[]], [['business']], [['staff']]])(
    'refuses a caller holding %p',
    async (roles) => {
      await seed('held', { ownerUserId: 'owner-a' });

      await expect(
        migrateRestaurantOwnerIdsHandler(asCaller(roles)),
      ).rejects.toMatchObject({ code: 'permission-denied' });
      expect(await read('held')).toMatchObject({ ownerUserId: 'owner-a' });
    },
  );

  it('runs for an operator', async () => {
    await seed('held', { ownerUserId: 'owner-a' });

    await expect(
      migrateRestaurantOwnerIdsHandler(asCaller(['admin'])),
    ).resolves.toMatchObject({ migrated: 1 });
  });
});
