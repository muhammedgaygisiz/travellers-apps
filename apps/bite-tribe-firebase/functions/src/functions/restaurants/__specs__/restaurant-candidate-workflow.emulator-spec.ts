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
): ReturnType<typeof verifyRestaurantCandidateHandler> =>
  verifyRestaurantCandidateHandler({
    auth: {
      uid: 'business-user-1',
      token: {},
    },
    data: {
      candidateId,
      restaurant: {
        name: 'Pizza Palace',
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

  it('keeps candidate creation and verification idempotent across repeated workflow runs', async () => {
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
      verifiedByUserId: 'business-user-1',
    });

    const menuSnapshot = await getFirestore().collection('menus').get();

    expect(menuSnapshot.docs[0].data()['categories']).toEqual([
      {
        title: 'Bites',
        items: [
          { name: 'Calzone', description: '', price: 14, isAvailable: true },
          {
            name: 'Margherita',
            description: '',
            price: 12.5,
            isAvailable: true,
          },
          { name: 'Tiramisu', description: '', price: 7, isAvailable: true },
        ],
      },
    ]);

    const linkedBiteSnapshots = await Promise.all(
      ['bite-new', 'bite-1', 'bite-2', 'bite-3', 'bite-4'].map((biteId) =>
        getFirestore().collection('bites').doc(biteId).get(),
      ),
    );

    expect(
      linkedBiteSnapshots.map((snapshot) => snapshot.data()?.['restaurantId']),
    ).toEqual([
      restaurantId,
      restaurantId,
      restaurantId,
      restaurantId,
      restaurantId,
    ]);
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
});
