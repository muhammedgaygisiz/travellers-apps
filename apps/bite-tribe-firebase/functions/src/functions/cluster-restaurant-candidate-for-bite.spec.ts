import { clusterRestaurantCandidateForBite } from './cluster-restaurant-candidate-for-bite';

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
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

jest.mock('./callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

interface SeedDoc {
  id: string;
  data: Record<string, unknown>;
}

const seed: Record<string, SeedDoc[]> = {};
const writes: Array<{
  path: string;
  data: Record<string, unknown>;
  options: unknown;
}> = [];

const toSnapshot = (
  doc: SeedDoc | undefined,
): {
  id: string;
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
} => ({
  id: doc?.id ?? '',
  exists: !!doc,
  data: () => doc?.data,
});

const makeCollection = (name: string): unknown => {
  const query = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    get: jest.fn(async () => ({ docs: (seed[name] ?? []).map(toSnapshot) })),
    doc: jest.fn((id?: string) => {
      const docId = id ?? `${name}-new-id`;

      return {
        id: docId,
        path: `${name}/${docId}`,
        get: jest.fn(async () =>
          toSnapshot((seed[name] ?? []).find((doc) => doc.id === docId)),
        ),
        set: jest.fn(
          async (data: Record<string, unknown>, options: unknown) => {
            writes.push({ path: `${name}/${docId}`, data, options });
          },
        ),
      };
    }),
  };

  return query;
};

const firestoreMock = {
  collection: jest.fn((name: string) => makeCollection(name)),
};

jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => firestoreMock),
}));

const CENTER = { latitude: 52.52, longitude: 13.405 };

const nearby = (index: number): { latitude: number; longitude: number } => ({
  latitude: CENTER.latitude + index * 0.0002,
  longitude: CENTER.longitude + index * 0.0002,
});

const biteDoc = (
  id: string,
  place: string,
  position: { latitude: number; longitude: number },
): SeedDoc => ({ id, data: { place, position } });

const request = (biteId: string): never =>
  ({
    auth: { uid: 'user-1' },
    data: { biteId },
  }) as never;

describe('clusterRestaurantCandidateForBite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(seed).forEach((key) => delete seed[key]);
    writes.length = 0;
  });

  it('stores repeated manual clustering attempts in the same deterministic document', async () => {
    seed['bites'] = [
      biteDoc('bite-selected', 'Pizza Palace', CENTER),
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
    ];

    const results = await Promise.all([
      clusterRestaurantCandidateForBite(request('bite-selected')),
      clusterRestaurantCandidateForBite(request('bite-selected')),
    ]);

    expect(writes).toHaveLength(2);
    expect(writes[0].path).toBe(writes[1].path);
    expect(writes[0].path).toMatch(/^restaurantCandidates\/pizza-palace-/);
    expect(results).toEqual([
      expect.objectContaining({
        candidateId: writes[0].path.split('/')[1],
        status: 'created',
      }),
      expect.objectContaining({
        candidateId: writes[0].path.split('/')[1],
        status: 'created',
      }),
    ]);
  });

  it('returns a verified restaurant match before writing a candidate', async () => {
    seed['bites'] = [biteDoc('bite-selected', 'Pizza Palace', CENTER)];
    seed['restaurants'] = [
      {
        id: 'restaurant-1',
        data: { name: 'Pizza Palace', position: nearby(1) },
      },
    ];

    const result = await clusterRestaurantCandidateForBite(
      request('bite-selected'),
    );

    expect(writes).toHaveLength(0);
    expect(result).toEqual({
      verifiedRestaurantId: 'restaurant-1',
      evidenceCount: 0,
      matchedBiteIds: [],
      skippedCounts: {
        invalidPosition: 0,
        verifiedBite: 0,
        outsideRadius: 0,
        nameMismatch: 0,
      },
      status: 'verified-restaurant-match',
    });
  });
});
