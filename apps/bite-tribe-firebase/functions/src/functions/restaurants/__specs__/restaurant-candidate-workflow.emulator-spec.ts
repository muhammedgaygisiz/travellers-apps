import { deleteApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { geohashForLocation } from 'geofire-common';
import { handleCreateRestaurantCandidateOnBiteCreate } from '../create-restaurant-candidate-on-bite-create';
import { verifyRestaurantCandidateHandler } from '../verify-restaurant-candidate';

const PROJECT_ID = 'bite-tribe-emulator-tests';
const CENTER = { latitude: 52.52, longitude: 13.405 };

const nearby = (index: number): { latitude: number; longitude: number } => ({
  latitude: CENTER.latitude + index * 0.0002,
  longitude: CENTER.longitude + index * 0.0002,
});

const withGeohash = (position: {
  latitude: number;
  longitude: number;
}): {
  position: { latitude: number; longitude: number };
  geohash: string;
} => ({
  position,
  geohash: geohashForLocation([position.latitude, position.longitude]),
});

const seedBite = async (
  id: string,
  place = 'Pizza Palace',
  position = CENTER,
  dish: { name: string; price: number } = { name: 'Margherita', price: 12 },
): Promise<void> => {
  await getFirestore()
    .collection('bites')
    .doc(id)
    .set({
      place,
      rating: 5,
      name: dish.name,
      price: dish.price,
      ...withGeohash(position),
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Date.now(),
    });
};

const clearCollection = async (collectionName: string): Promise<void> => {
  const collectionRef = getFirestore().collection(collectionName);
  const snapshot = await collectionRef.limit(1).get();

  if (!snapshot.empty) {
    await getFirestore().recursiveDelete(collectionRef);
  }
};

const clearWorkflowCollections = async (): Promise<void> => {
  await Promise.all(
    ['bites', 'restaurantCandidates', 'restaurants', 'menus'].map(
      clearCollection,
    ),
  );
};

const queryCount = async (collectionName: string): Promise<number> =>
  (await getFirestore().collection(collectionName).count().get()).data().count;

const verifyCandidate = (
  candidateId: string,
  restaurantName = 'Pizza Palace',
): ReturnType<typeof verifyRestaurantCandidateHandler> =>
  verifyRestaurantCandidateHandler({
    auth: {
      uid: 'operator-1',
      token: { roles: ['admin'] },
    },
    data: {
      candidateId,
      restaurant: {
        name: restaurantName,
        position: CENTER,
      },
    },
  } as never);

describe('restaurant candidate workflow emulator integration', () => {
  beforeAll(() => {
    if (!process.env['FIRESTORE_EMULATOR_HOST']) {
      throw new Error(
        'restaurant candidate workflow emulator specs require the Firestore emulator.',
      );
    }

    if (!getApps().length) {
      initializeApp({ projectId: PROJECT_ID });
    }
  });

  beforeEach(async () => {
    await clearWorkflowCollections();
  });

  afterAll(async () => {
    await clearWorkflowCollections();
    await Promise.all(getApps().map((app) => deleteApp(app)));
  });

  /**
   * Both halves of this run race two transactions on one document, and the
   * loser of each race is retried after the Admin SDK's backoff, which lands
   * about three and a half seconds in. Verification always raced; since #1497
   * the candidate write is a transaction too, so two races together are past
   * Jest's five-second default. The time is the SDK's backoff, not a deadlock.
   */
  const RACE_TIMEOUT_MS = 30_000;

  it(
    'keeps candidate creation and verification idempotent across repeated workflow runs',
    async () => {
      await Promise.all([
        seedBite('bite-new', 'Pizza Palace', CENTER, {
          name: 'Margherita',
          price: 12,
        }),
        seedBite('bite-1', 'Pizza Palace', nearby(1), {
          name: 'Margherita',
          price: 13,
        }),
        seedBite('bite-2', 'Pizza Palace', nearby(2), {
          name: 'Tiramisu',
          price: 7,
        }),
        seedBite('bite-3', 'Pizza Palace', nearby(3), {
          name: 'Calzone',
          price: 14,
        }),
        seedBite('bite-4', 'Pizza Palace', nearby(4), {
          name: 'Calzone',
          price: 14,
        }),
      ]);

      const selectedBiteSnapshot = await getFirestore()
        .collection('bites')
        .doc('bite-new')
        .get();

      await Promise.all([
        handleCreateRestaurantCandidateOnBiteCreate(selectedBiteSnapshot),
        handleCreateRestaurantCandidateOnBiteCreate(selectedBiteSnapshot),
      ]);

      const candidateSnapshot = await getFirestore()
        .collection('restaurantCandidates')
        .get();
      const candidateDocs = candidateSnapshot.docs;

      expect(candidateDocs).toHaveLength(1);
      expect(candidateDocs[0].data()).toMatchObject({
        status: 'pending',
        normalizedName: 'pizza palace',
        evidence: {
          biteCount: 5,
        },
      });
      expect(candidateDocs[0].data()['biteIds']).toEqual(
        expect.arrayContaining([
          'bite-new',
          'bite-1',
          'bite-2',
          'bite-3',
          'bite-4',
        ]),
      );

      const verificationResults = await Promise.all([
        verifyCandidate(candidateDocs[0].id),
        verifyCandidate(candidateDocs[0].id),
      ]);

      expect(
        new Set(verificationResults.map((result) => result.restaurantId)).size,
      ).toBe(1);
      expect(await queryCount('restaurants')).toBe(1);
      expect(await queryCount('menus')).toBe(1);

      const verifiedCandidateSnapshot = await candidateDocs[0].ref.get();
      const verifiedCandidate = verifiedCandidateSnapshot.data();
      const restaurantId = verificationResults[0].restaurantId;

      expect(verifiedCandidate).toMatchObject({
        status: 'verified',
        verifiedRestaurantId: restaurantId,
        verifiedByUserId: 'operator-1',
        skippedBiteIds: [],
      });

      const menuSnapshot = await getFirestore().collection('menus').get();

      // The category and every dish are born with an id (issue #1099), so a menu
      // created here never needs the admin backfill.
      expect(menuSnapshot.docs[0].data()['categories']).toEqual([
        {
          id: expect.any(String),
          title: 'Bites',
          items: [
            {
              id: expect.any(String),
              name: 'Calzone',
              description: '',
              price: 14,
              isAvailable: true,
            },
            {
              id: expect.any(String),
              name: 'Margherita',
              description: '',
              price: 12.5,
              isAvailable: true,
            },
            {
              id: expect.any(String),
              name: 'Tiramisu',
              description: '',
              price: 7,
              isAvailable: true,
            },
          ],
        },
      ]);

      const linkedBiteSnapshots = await Promise.all(
        ['bite-new', 'bite-1', 'bite-2', 'bite-3', 'bite-4'].map((biteId) =>
          getFirestore().collection('bites').doc(biteId).get(),
        ),
      );

      expect(
        linkedBiteSnapshots.map(
          (snapshot) => snapshot.data()?.['restaurantId'],
        ),
      ).toEqual([
        restaurantId,
        restaurantId,
        restaurantId,
        restaurantId,
        restaurantId,
      ]);
    },
    RACE_TIMEOUT_MS,
  );

  /**
   * Issue #1498. Detection lists only unassigned Bites, but a Bite Creator can
   * pick a verified restaurant for one of them before the operator verifies.
   * Verification used to repoint that Bite at the restaurant it created.
   */
  it('leaves an evidence Bite assigned after clustering on its own restaurant', async () => {
    await Promise.all([
      seedBite('bite-new', 'Pizza Palace', CENTER, {
        name: 'Margherita',
        price: 12,
      }),
      seedBite('bite-1', 'Pizza Palace', nearby(1), {
        name: 'Margherita',
        price: 13,
      }),
      seedBite('bite-2', 'Pizza Palace', nearby(2), {
        name: 'Tiramisu',
        price: 7,
      }),
      seedBite('bite-3', 'Pizza Palace', nearby(3), {
        name: 'Calzone',
        price: 14,
      }),
      seedBite('bite-4', 'Pizza Palace', nearby(4), {
        name: 'Calzone',
        price: 14,
      }),
    ]);
    await handleCreateRestaurantCandidateOnBiteCreate(
      await getFirestore().collection('bites').doc('bite-new').get(),
    );

    const [candidateDoc] = (
      await getFirestore().collection('restaurantCandidates').get()
    ).docs;
    const bites = getFirestore().collection('bites');

    await Promise.all([
      bites.doc('bite-2').update({ restaurantId: 'restaurant-chosen' }),
      bites
        .doc('bite-3')
        .update({ restaurantId: 'restaurants/restaurant-chosen' }),
    ]);

    const result = await verifyCandidate(candidateDoc.id);

    expect(result.skippedBiteIds).toEqual(
      expect.arrayContaining(['bite-2', 'bite-3']),
    );
    expect(result.skippedBiteIds).toHaveLength(2);
    expect((await candidateDoc.ref.get()).data()).toMatchObject({
      status: 'verified',
      verifiedRestaurantId: result.restaurantId,
      skippedBiteIds: result.skippedBiteIds,
    });

    const restaurantIds = await Promise.all(
      ['bite-new', 'bite-1', 'bite-2', 'bite-3', 'bite-4'].map(
        async (biteId) =>
          (await bites.doc(biteId).get()).data()?.['restaurantId'],
      ),
    );

    expect(restaurantIds).toEqual([
      result.restaurantId,
      result.restaurantId,
      'restaurant-chosen',
      'restaurants/restaurant-chosen',
      result.restaurantId,
    ]);

    const [menuDoc] = (await getFirestore().collection('menus').get()).docs;
    const dishNames = menuDoc
      .data()
      ['categories'].flatMap((category: { items: { name: string }[] }) =>
        category.items.map((item) => item.name),
      );

    expect([...dishNames].sort()).toEqual(['Calzone', 'Margherita']);
  });

  it('does not create a candidate when a matching verified restaurant already exists', async () => {
    await getFirestore()
      .collection('restaurants')
      .doc('restaurant-1')
      .set({
        name: 'Pizza Palace',
        ...withGeohash(nearby(1)),
      });
    await Promise.all([
      seedBite('bite-new', 'Pizza Palace', CENTER),
      seedBite('bite-1', 'Pizza Palace', nearby(1)),
      seedBite('bite-2', 'Pizza Palace', nearby(2)),
      seedBite('bite-3', 'Pizza Palace', nearby(3)),
      seedBite('bite-4', 'Pizza Palace', nearby(4)),
    ]);

    const selectedBiteSnapshot = await getFirestore()
      .collection('bites')
      .doc('bite-new')
      .get();

    await handleCreateRestaurantCandidateOnBiteCreate(selectedBiteSnapshot);

    expect(await queryCount('restaurantCandidates')).toBe(0);
  });

  /**
   * Issue #1497. Once the Operator corrects the name on verification, the
   * verified-restaurant check no longer recognises the place, and the next
   * five Bites resolve to the same derived candidate id. Before the guard they
   * reset it to pending, and verifying it again created a second restaurant.
   */
  it('never resets a verified candidate when new Bites resolve to its id', async () => {
    await Promise.all(
      ['bite-new', 'bite-1', 'bite-2', 'bite-3', 'bite-4'].map((id, index) =>
        seedBite(id, 'Pizza Palace', index ? nearby(index) : CENTER),
      ),
    );
    await handleCreateRestaurantCandidateOnBiteCreate(
      await getFirestore().collection('bites').doc('bite-new').get(),
    );

    const [candidateDoc] = (
      await getFirestore().collection('restaurantCandidates').get()
    ).docs;

    await verifyCandidate(candidateDoc.id, 'Ristorante Luigi');

    const verifiedCandidate = (await candidateDoc.ref.get()).data();

    await Promise.all(
      ['later-new', 'later-1', 'later-2', 'later-3', 'later-4'].map(
        (id, index) =>
          seedBite(id, 'Pizza Palace', index ? nearby(index) : CENTER),
      ),
    );
    await handleCreateRestaurantCandidateOnBiteCreate(
      await getFirestore().collection('bites').doc('later-new').get(),
    );

    expect((await candidateDoc.ref.get()).data()).toEqual(verifiedCandidate);
    expect(await queryCount('restaurantCandidates')).toBe(1);
    expect(await queryCount('restaurants')).toBe(1);

    const laterBiteSnapshot = await getFirestore()
      .collection('bites')
      .doc('later-new')
      .get();

    expect(laterBiteSnapshot.data()?.['restaurantId']).toBeUndefined();
  });
});
