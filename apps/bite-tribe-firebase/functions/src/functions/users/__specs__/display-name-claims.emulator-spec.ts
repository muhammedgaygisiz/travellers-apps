import * as admin from 'firebase-admin';
import { claimDisplayNameForUser } from '../claim-display-name';
import { checkDisplayNameAvailabilityForUser } from '../check-display-name-availability';
import { backfillDisplayNameClaims } from '../backfill-display-name-claims';

const PROJECT_ID = 'bite-tribe-emulator-tests';
const DISPLAY_NAMES_COLLECTION = 'displayNames';
const USERS_COLLECTION = 'users';

const claimRef = (normalizedName: string): admin.firestore.DocumentReference =>
  admin.firestore().collection(DISPLAY_NAMES_COLLECTION).doc(normalizedName);

const userRef = (uid: string): admin.firestore.DocumentReference =>
  admin.firestore().collection(USERS_COLLECTION).doc(uid);

const seedUser = async (
  uid: string,
  displayName: string,
  createdAtTimestamp: number,
  extraData: Record<string, unknown> = {},
): Promise<void> => {
  await userRef(uid).set({
    userId: uid,
    displayName,
    createdAtTimestamp,
    ...extraData,
  });
};

const clearCollection = async (collectionName: string): Promise<void> => {
  const collectionRef = admin.firestore().collection(collectionName);
  const snapshot = await collectionRef.limit(1).get();

  if (!snapshot.empty) {
    await admin.firestore().recursiveDelete(collectionRef);
  }
};

const clearCollections = async (): Promise<void> => {
  await Promise.all(
    [DISPLAY_NAMES_COLLECTION, USERS_COLLECTION].map(clearCollection),
  );
};

const queryCount = async (collectionName: string): Promise<number> =>
  (await admin.firestore().collection(collectionName).count().get()).data()
    .count;

describe('display name claims emulator integration', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'display name claim emulator specs require the Firestore emulator.',
      );
    }

    if (!admin.apps.length) {
      admin.initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await clearCollections();
  });

  afterAll(async () => {
    await clearCollections();
    await Promise.all(admin.apps.map((app) => app?.delete()));
  });

  it('only lets one of two concurrent claims of the same normalized name win', async () => {
    await Promise.all([seedUser('user-1', '', 1), seedUser('user-2', '', 2)]);

    const outcomes = await Promise.allSettled([
      claimDisplayNameForUser('user-1', 'Foodie'),
      claimDisplayNameForUser('user-2', 'foodie'),
    ]);

    const fulfilled = outcomes.filter(
      (outcome) => outcome.status === 'fulfilled',
    );
    const rejected = outcomes.filter(
      (outcome) => outcome.status === 'rejected',
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      message: 'display_name_taken',
    });

    expect(await queryCount(DISPLAY_NAMES_COLLECTION)).toBe(1);
    const claim = await claimRef('foodie').get();
    expect(claim.data()).toMatchObject({ normalizedDisplayName: 'foodie' });
  });

  it('releases the old claim and takes the new one on rename in one transaction', async () => {
    await seedUser('user-1', '', 1);

    await claimDisplayNameForUser('user-1', 'OldName');
    expect((await claimRef('oldname').get()).exists).toBe(true);

    await claimDisplayNameForUser('user-1', 'NewName');

    expect((await claimRef('oldname').get()).exists).toBe(false);
    expect((await claimRef('newname').get()).data()).toMatchObject({
      userId: 'user-1',
      displayName: 'NewName',
    });
    expect(await queryCount(DISPLAY_NAMES_COLLECTION)).toBe(1);

    const user = await userRef('user-1').get();
    expect(user.data()).toMatchObject({
      displayName: 'NewName',
      normalizedDisplayName: 'newname',
    });
  });

  it('lets a user re-take a normalized name they already own, updating the casing', async () => {
    await seedUser('user-1', '', 1);

    await claimDisplayNameForUser('user-1', 'foodie');
    await claimDisplayNameForUser('user-1', 'FOODIE');

    expect(await queryCount(DISPLAY_NAMES_COLLECTION)).toBe(1);
    expect((await claimRef('foodie').get()).data()).toMatchObject({
      userId: 'user-1',
      displayName: 'FOODIE',
    });
  });

  it('reports availability, treating the caller as owner of their own claim', async () => {
    await Promise.all([seedUser('user-1', '', 1), seedUser('user-2', '', 2)]);
    await claimDisplayNameForUser('user-1', 'Taken');

    expect(
      await checkDisplayNameAvailabilityForUser('user-2', 'Taken'),
    ).toMatchObject({ available: false, normalizedDisplayName: 'taken' });

    expect(
      await checkDisplayNameAvailabilityForUser('user-1', 'taken'),
    ).toMatchObject({ available: true });

    expect(
      await checkDisplayNameAvailabilityForUser('user-2', 'Free'),
    ).toMatchObject({ available: true });
  });

  it('treats a legacy user display name without a claim as unavailable', async () => {
    await Promise.all([
      seedUser('user-1', 'Organisation A', 1),
      seedUser('user-2', '', 2),
    ]);

    expect(
      await checkDisplayNameAvailabilityForUser('user-2', 'Organisation A'),
    ).toMatchObject({
      available: false,
      normalizedDisplayName: 'organisation a',
    });

    await expect(
      claimDisplayNameForUser('user-2', 'Organisation A'),
    ).rejects.toMatchObject({
      message: 'display_name_taken',
    });
  });

  it('treats a legacy normalized display name without a claim as unavailable', async () => {
    await Promise.all([
      seedUser('user-1', 'organisation a', 1, {
        normalizedDisplayName: 'organisation a',
      }),
      seedUser('user-2', '', 2),
    ]);

    expect(
      await checkDisplayNameAvailabilityForUser('user-2', 'Organisation A'),
    ).toMatchObject({
      available: false,
      normalizedDisplayName: 'organisation a',
    });

    await expect(
      claimDisplayNameForUser('user-2', 'Organisation A'),
    ).rejects.toMatchObject({
      message: 'display_name_taken',
    });
  });

  it('backfills existing names first-come, leaving later collisions unclaimed', async () => {
    await Promise.all([
      seedUser('user-early', 'Foodie', 1),
      seedUser('user-late', 'foodie', 2),
      seedUser('user-other', 'Traveller', 3),
    ]);

    const result = await backfillDisplayNameClaims();

    expect(result).toMatchObject({
      processed: 3,
      claimed: 2,
      collisions: 1,
    });

    expect(await queryCount(DISPLAY_NAMES_COLLECTION)).toBe(2);
    expect((await claimRef('foodie').get()).data()).toMatchObject({
      userId: 'user-early',
      backfilled: true,
    });

    // Running again is idempotent: the owned claim is skipped, no new writes.
    const secondRun = await backfillDisplayNameClaims();
    expect(secondRun).toMatchObject({ claimed: 0, collisions: 1 });
    expect(await queryCount(DISPLAY_NAMES_COLLECTION)).toBe(2);
  });
});
