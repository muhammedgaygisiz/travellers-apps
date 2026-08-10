import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { DocumentReference, getFirestore } from 'firebase-admin/firestore';
import { claimDisplayNameForUser } from '../claim-display-name';
import { checkDisplayNameAvailabilityForUser } from '../check-display-name-availability';

const PROJECT_ID = 'bite-tribe-emulator-tests';
const DISPLAY_NAMES_COLLECTION = 'displayNames';
const USERS_COLLECTION = 'users';

const claimRef = (normalizedName: string): DocumentReference =>
  getFirestore().collection(DISPLAY_NAMES_COLLECTION).doc(normalizedName);

const userRef = (uid: string): DocumentReference =>
  getFirestore().collection(USERS_COLLECTION).doc(uid);

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
  const collectionRef = getFirestore().collection(collectionName);
  const snapshot = await collectionRef.limit(1).get();

  if (!snapshot.empty) {
    await getFirestore().recursiveDelete(collectionRef);
  }
};

const clearCollections = async (): Promise<void> => {
  await Promise.all(
    [DISPLAY_NAMES_COLLECTION, USERS_COLLECTION].map(clearCollection),
  );
};

const queryCount = async (collectionName: string): Promise<number> =>
  (await getFirestore().collection(collectionName).count().get()).data().count;

describe('display name claims emulator integration', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'display name claim emulator specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await clearCollections();
  });

  afterAll(async () => {
    await clearCollections();
    await Promise.all(getApps().map((app) => deleteApp(app)));
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

  /**
   * The two specs above prove a legacy name is protected without a claim, which
   * is why there is no backfill. This is the other half: the legacy user gets
   * their own claim by returning, since `onboardingGuard` routes anyone without
   * `onboardingCompletedAt` through the assistant and it claims for them. See
   * [[UC - Run Operational Migrations]].
   */
  it('lets a legacy user claim the name they already store', async () => {
    await seedUser('user-legacy', 'Foodie', 1);

    await claimDisplayNameForUser('user-legacy', 'Foodie');

    expect((await claimRef('foodie').get()).data()).toMatchObject({
      userId: 'user-legacy',
    });
  });
});
