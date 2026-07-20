import { verifyRestaurantCandidate } from '../verify-restaurant-candidate';

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
  },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  },
}));

jest.mock('geofire-common', () => ({
  geohashForLocation: jest.fn(() => 'geohash-1'),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

type DocRef = {
  collectionName: string;
  id: string;
  path: string;
};

const docRef = (collectionName: string, id: string): DocRef => ({
  collectionName,
  id,
  path: `${collectionName}/${id}`,
});

const firestoreMock = {
  collection: jest.fn((collectionName: string) => ({
    doc: jest.fn((id?: string) =>
      docRef(collectionName, id ?? `${collectionName}-new-id`),
    ),
  })),
  runTransaction: jest.fn(),
};

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
}));

const request = (data: unknown): never =>
  ({
    auth: { uid: 'user-1' },
    data,
  }) as never;

describe('verifyRestaurantCandidate', () => {
  const createMock = jest.fn();
  const updateMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    firestoreMock.runTransaction.mockImplementation((handler) =>
      handler({
        get: jest.fn(async (ref: DocRef) => {
          if (ref.path === 'restaurantCandidates/candidate-1') {
            return {
              exists: true,
              data: (): { status: string; biteIds: string[] } => ({
                status: 'pending',
                biteIds: ['bite-1', 'bite-2'],
              }),
            };
          }

          return { exists: false, data: (): any => undefined };
        }),
        create: createMock,
        update: updateMock,
      }),
    );
  });

  it('creates a verified restaurant, menu, Bite links, and candidate metadata for pending candidates', async () => {
    const result = await verifyRestaurantCandidate(
      request({
        candidateId: 'candidate-1',
        restaurant: {
          name: 'Pizza Palace',
          position: { latitude: 46.948, longitude: 7.4474 },
          image: 'data:image/png;base64,abc',
        },
      }),
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'restaurants/restaurants-new-id' }),
      expect.objectContaining({
        name: 'Pizza Palace',
        menuId: 'menus-new-id',
        geohash: 'geohash-1',
      }),
    );
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'menus/menus-new-id' }),
      expect.objectContaining({ categories: [] }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'bites/bite-1' }),
      expect.objectContaining({ restaurantId: 'restaurants-new-id' }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'bites/bite-2' }),
      expect.objectContaining({ restaurantId: 'restaurants-new-id' }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'restaurantCandidates/candidate-1' }),
      expect.objectContaining({
        status: 'verified',
        verifiedRestaurantId: 'restaurants-new-id',
        verifiedByUserId: 'user-1',
      }),
    );
    expect(result).toEqual({
      restaurantId: 'restaurants-new-id',
      menuId: 'menus-new-id',
      candidateId: 'candidate-1',
      status: 'created',
    });
  });

  it('returns the existing verified restaurant without creating duplicates', async () => {
    firestoreMock.runTransaction.mockImplementation((handler) =>
      handler({
        get: jest.fn(async () => ({
          exists: true,
          data: (): { status: string; verifiedRestaurantId: string } => ({
            status: 'verified',
            verifiedRestaurantId: 'restaurant-1',
          }),
        })),
        create: createMock,
        update: updateMock,
      }),
    );

    const result = await verifyRestaurantCandidate(
      request({
        candidateId: 'candidate-1',
        restaurant: {
          name: 'Pizza Palace',
          position: { latitude: 46.948, longitude: 7.4474 },
        },
      }),
    );

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      restaurantId: 'restaurant-1',
      candidateId: 'candidate-1',
      status: 'already-verified',
    });
  });

  it('returns the merged candidate restaurant without creating duplicates', async () => {
    firestoreMock.runTransaction.mockImplementation((handler) =>
      handler({
        get: jest.fn(async (ref: DocRef) => {
          if (ref.path === 'restaurantCandidates/candidate-1') {
            return {
              exists: true,
              data: (): {
                status: string;
                mergedIntoCandidateId: string;
              } => ({
                status: 'merged',
                mergedIntoCandidateId: 'candidate-verified',
              }),
            };
          }

          if (ref.path === 'restaurantCandidates/candidate-verified') {
            return {
              exists: true,
              data: (): { verifiedRestaurantId: string } => ({
                verifiedRestaurantId: 'restaurant-merged',
              }),
            };
          }

          return { exists: false, data: (): any => undefined };
        }),
        create: createMock,
        update: updateMock,
      }),
    );

    const result = await verifyRestaurantCandidate(
      request({
        candidateId: 'candidate-1',
        restaurant: {
          name: 'Pizza Palace',
          position: { latitude: 46.948, longitude: 7.4474 },
        },
      }),
    );

    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
    expect(result).toEqual({
      restaurantId: 'restaurant-merged',
      candidateId: 'candidate-1',
      status: 'already-verified',
    });
  });

  it('rejects dismissed candidates without creating a restaurant', async () => {
    firestoreMock.runTransaction.mockImplementation((handler) =>
      handler({
        get: jest.fn(async () => ({
          exists: true,
          data: (): { status: string } => ({
            status: 'dismissed',
          }),
        })),
        create: createMock,
        update: updateMock,
      }),
    );

    await expect(
      verifyRestaurantCandidate(
        request({
          candidateId: 'candidate-1',
          restaurant: {
            name: 'Pizza Palace',
            position: { latitude: 46.948, longitude: 7.4474 },
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
    });
    expect(createMock).not.toHaveBeenCalled();
    expect(updateMock).not.toHaveBeenCalled();
  });
});
