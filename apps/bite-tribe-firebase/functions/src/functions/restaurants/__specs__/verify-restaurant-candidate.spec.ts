import { logger } from 'firebase-functions';
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

/** A caller the verified ID token says holds `roles`. */
const callerWith = (roles: unknown): { uid: string; token: unknown } => ({
  uid: 'user-1',
  token: { roles },
});

const request = (data: unknown, caller = callerWith(['admin'])): never =>
  ({
    auth: caller,
    data,
  }) as never;

const codeOf = async (promise: Promise<unknown>): Promise<string> => {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }

  throw new Error('Expected the callable to reject, but it resolved.');
};

/**
 * The callable creates restaurants, so the gate on it is the point. A consumer
 * account reaching it could mint a restaurant from a crafted payload before
 * issue #1472.
 */
describe('verifyRestaurantCandidate authorization', () => {
  const data = { candidateId: 'candidate-1' };

  it('rejects an unauthenticated caller', async () => {
    const code = await codeOf(
      verifyRestaurantCandidate({ data } as never) as Promise<unknown>,
    );

    expect(code).toBe('unauthenticated');
  });

  it('rejects a consumer account holding no roles', async () => {
    const code = await codeOf(
      verifyRestaurantCandidate(
        request(data, callerWith(undefined)),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });

  it('rejects a caller holding only the business role', async () => {
    const code = await codeOf(
      verifyRestaurantCandidate(
        request(data, callerWith(['business'])),
      ) as Promise<unknown>,
    );

    expect(code).toBe('permission-denied');
  });
});

describe('verifyRestaurantCandidate', () => {
  const createMock = jest.fn();
  const updateMock = jest.fn();

  const biteSnapshot = (
    ref: DocRef,
    name: string,
    price: number,
    restaurantId?: string,
  ): { exists: boolean; ref: DocRef; data: () => unknown } => ({
    exists: true,
    ref,
    data: (): { name: string; price: number; restaurantId?: string } => ({
      name,
      price,
      ...(restaurantId === undefined ? {} : { restaurantId }),
    }),
  });

  const getAllMock = jest.fn(async (...refs: DocRef[]) =>
    refs.map((ref) =>
      ref.id === 'bite-1'
        ? biteSnapshot(ref, 'Margherita', 12)
        : biteSnapshot(ref, 'Margherita', 13),
    ),
  );

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
        getAll: getAllMock,
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
      expect.objectContaining({
        categories: [
          {
            id: expect.any(String),
            title: 'Bites',
            items: [
              {
                id: expect.any(String),
                name: 'Margherita',
                description: '',
                price: 12.5,
                isAvailable: true,
              },
            ],
          },
        ],
      }),
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
        skippedBiteIds: [],
      }),
    );
    expect(result).toEqual({
      restaurantId: 'restaurants-new-id',
      menuId: 'menus-new-id',
      menuItemCount: 1,
      candidateId: 'candidate-1',
      skippedBiteIds: [],
      status: 'created',
    });
  });

  /**
   * Issue #1498. A Bite Creator can pick a verified restaurant for a Bite that
   * is still listed on a pending candidate. Verifying the candidate used to
   * repoint that Bite at the new restaurant, silently.
   */
  describe('evidence Bites that already name a restaurant', () => {
    const verify = (): ReturnType<typeof verifyRestaurantCandidate> =>
      verifyRestaurantCandidate(
        request({
          candidateId: 'candidate-1',
          restaurant: {
            name: 'Pizza Palace',
            position: { latitude: 46.948, longitude: 7.4474 },
          },
        }),
      );

    const withBite2AssignedTo = (restaurantId: string): void => {
      getAllMock.mockImplementationOnce(async (...refs: DocRef[]) =>
        refs.map((ref) =>
          ref.id === 'bite-1'
            ? biteSnapshot(ref, 'Margherita', 12, '')
            : biteSnapshot(ref, 'Tiramisu', 7, restaurantId),
        ),
      );
    };

    it.each([
      ['a bare id', 'restaurant-chosen'],
      ['a document path', 'restaurants/restaurant-chosen'],
    ])(
      'leaves a Bite whose restaurantId is %s untouched and names it as skipped',
      async (_shape, restaurantId) => {
        withBite2AssignedTo(restaurantId);

        const result = await verify();

        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'bites/bite-1' }),
          expect.objectContaining({ restaurantId: 'restaurants-new-id' }),
        );
        expect(updateMock).not.toHaveBeenCalledWith(
          expect.objectContaining({ path: 'bites/bite-2' }),
          expect.anything(),
        );
        expect(updateMock).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'restaurantCandidates/candidate-1' }),
          expect.objectContaining({
            status: 'verified',
            skippedBiteIds: ['bite-2'],
          }),
        );
        expect(result).toMatchObject({
          status: 'created',
          skippedBiteIds: ['bite-2'],
        });
      },
    );

    it('derives the initial menu only from the Bites it assigns', async () => {
      withBite2AssignedTo('restaurant-chosen');

      const result = await verify();

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'menus/menus-new-id' }),
        expect.objectContaining({
          categories: [
            expect.objectContaining({
              items: [expect.objectContaining({ name: 'Margherita' })],
            }),
          ],
        }),
      );
      expect(result.menuItemCount).toBe(1);
    });

    it('still verifies the candidate when every listed Bite is skipped', async () => {
      getAllMock.mockImplementationOnce(async (...refs: DocRef[]) =>
        refs.map((ref) =>
          biteSnapshot(ref, 'Margherita', 12, 'restaurant-chosen'),
        ),
      );

      const result = await verify();

      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'menus/menus-new-id' }),
        expect.objectContaining({ categories: [] }),
      );
      expect(updateMock).toHaveBeenCalledTimes(1);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ path: 'restaurantCandidates/candidate-1' }),
        expect.objectContaining({
          status: 'verified',
          verifiedRestaurantId: 'restaurants-new-id',
          skippedBiteIds: ['bite-1', 'bite-2'],
        }),
      );
      expect(result).toMatchObject({
        status: 'created',
        menuItemCount: 0,
        skippedBiteIds: ['bite-1', 'bite-2'],
      });
    });
  });

  it('skips candidate Bites that no longer exist', async () => {
    getAllMock.mockImplementationOnce(async (...refs: DocRef[]) =>
      refs.map((ref) =>
        ref.id === 'bite-1'
          ? biteSnapshot(ref, 'Margherita', 12)
          : { exists: false, ref, data: (): unknown => undefined },
      ),
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

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'menus/menus-new-id' }),
      expect.objectContaining({
        categories: [
          {
            id: expect.any(String),
            title: 'Bites',
            items: [
              {
                id: expect.any(String),
                name: 'Margherita',
                description: '',
                price: 12,
                isAvailable: true,
              },
            ],
          },
        ],
      }),
    );
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'bites/bite-1' }),
      expect.objectContaining({ restaurantId: 'restaurants-new-id' }),
    );
    expect(updateMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ path: 'bites/bite-2' }),
      expect.anything(),
    );
    expect(result.menuItemCount).toBe(1);
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

  /**
   * The callable mints a restaurant, and until issue #1477 its logs named the
   * candidate and never the operator: who ran it survived only as
   * `verifiedByUserId` on the candidate document, which the trail of an
   * operator's actions cannot be assembled from.
   */
  it('records the operator, the candidate and the outcome in the audit trail', async () => {
    await verifyRestaurantCandidate(
      request({
        candidateId: 'candidate-1',
        restaurant: {
          name: 'Pizza Palace',
          position: { latitude: 46.948, longitude: 7.4474 },
        },
      }),
    );

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('verifyRestaurantCandidate started'),
      expect.objectContaining({
        operatorAction: 'verifyRestaurantCandidate',
        callerUid: 'user-1',
        callerRoles: ['admin'],
        targetType: 'restaurantCandidate',
        targetId: 'candidate-1',
        outcome: 'started',
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('verifyRestaurantCandidate succeeded'),
      expect.objectContaining({
        operatorAction: 'verifyRestaurantCandidate',
        callerUid: 'user-1',
        targetId: 'candidate-1',
        outcome: 'succeeded',
        details: expect.objectContaining({
          restaurantId: 'restaurants-new-id',
          status: 'created',
        }),
      }),
    );
  });
});
