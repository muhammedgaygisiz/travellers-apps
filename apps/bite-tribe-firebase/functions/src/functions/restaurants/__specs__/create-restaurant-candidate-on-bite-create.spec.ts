import {
  RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD,
  createRestaurantCandidateOnBiteCreate,
} from '../create-restaurant-candidate-on-bite-create';

jest.mock('firebase-functions', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('firebase-functions/firestore', () => ({
  onDocumentCreated: jest.fn((_document: unknown, handler: unknown) => handler),
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

const toSnapshot = (doc: SeedDoc): unknown => ({
  id: doc.id,
  data: (): Record<string, unknown> => doc.data,
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

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
}));

const CENTER = { latitude: 52.52, longitude: 13.405 };

// Small offsets around the Berlin center stay well within the 200m radius.
const nearby = (index: number): { latitude: number; longitude: number } => ({
  latitude: CENTER.latitude + index * 0.0002,
  longitude: CENTER.longitude + index * 0.0002,
});

const biteDoc = (
  id: string,
  place: string,
  position: { latitude: number; longitude: number },
  extra: Record<string, unknown> = {},
): SeedDoc => ({ id, data: { place, position, ...extra } });

const triggerEvent = (id: string, data: Record<string, unknown>): unknown => ({
  data: toSnapshot({ id, data }),
  params: { biteId: id },
});

const runTrigger = (
  id: string,
  data: Record<string, unknown>,
): Promise<unknown> =>
  (
    createRestaurantCandidateOnBiteCreate as unknown as (
      event: unknown,
    ) => Promise<unknown>
  )(triggerEvent(id, data));

describe('createRestaurantCandidateOnBiteCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(seed).forEach((key) => delete seed[key]);
    writes.length = 0;
  });

  it('creates one candidate when at least the threshold of nearby bites match', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
      biteDoc('bite-3', 'Pizza Palace', nearby(3)),
      biteDoc('bite-4', 'Pizza Palace', nearby(4)),
    ];

    await runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER });

    expect(writes).toHaveLength(1);
    expect(writes[0].path).toMatch(/^restaurantCandidates\/pizza-palace-/);
    expect(writes[0].options).toEqual({ merge: true });
    expect(writes[0].data.status).toBe('pending');
    expect(writes[0].data.biteIds).toHaveLength(
      RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD,
    );
    expect((writes[0].data.evidence as { biteCount: number }).biteCount).toBe(
      RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD,
    );
  });

  it('does not create a candidate below the evidence threshold', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
    ];

    await runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER });

    expect(writes).toHaveLength(0);
  });

  it('skips bites already attached to a verified restaurant', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
      biteDoc('bite-3', 'Pizza Palace', nearby(3)),
      biteDoc('bite-4', 'Pizza Palace', nearby(4)),
    ];

    await runTrigger('bite-new', {
      place: 'Pizza Palace',
      position: CENTER,
      restaurantId: 'restaurant-1',
    });

    expect(writes).toHaveLength(0);
  });

  it('does not create a candidate when a nearby verified restaurant matches', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
      biteDoc('bite-3', 'Pizza Palace', nearby(3)),
      biteDoc('bite-4', 'Pizza Palace', nearby(4)),
    ];
    seed['restaurants'] = [
      {
        id: 'restaurant-1',
        data: { name: 'Pizza Palace', position: nearby(1) },
      },
    ];

    await runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER });

    expect(writes).toHaveLength(0);
  });

  it('updates a nearby pending candidate instead of creating a duplicate', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
      biteDoc('bite-3', 'Pizza Palace', nearby(3)),
      biteDoc('bite-4', 'Pizza Palace', nearby(4)),
    ];
    seed['restaurantCandidates'] = [
      {
        id: 'candidate-1',
        data: {
          name: 'Pizza Palace',
          normalizedName: 'pizza palace',
          status: 'pending',
          position: nearby(1),
          geohash: 'geohash-1',
          biteIds: ['bite-existing'],
          evidence: { biteCount: 1, placeNames: { 'Pizza Palace': 1 } },
        },
      },
    ];

    await runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER });

    expect(writes).toHaveLength(1);
    expect(writes[0].path).toBe('restaurantCandidates/candidate-1');
    expect(writes[0].data.biteIds).toEqual(
      expect.arrayContaining(['bite-existing', 'bite-new']),
    );
    expect((writes[0].data.evidence as { biteCount: number }).biteCount).toBe(
      RESTAURANT_CANDIDATE_EVIDENCE_THRESHOLD + 1,
    );
  });

  it('stores repeated candidate creation attempts in the same deterministic document', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
      biteDoc('bite-3', 'Pizza Palace', nearby(3)),
      biteDoc('bite-4', 'Pizza Palace', nearby(4)),
    ];

    await Promise.all([
      runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER }),
      runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER }),
    ]);

    expect(writes).toHaveLength(2);
    expect(writes[0].path).toBe(writes[1].path);
    expect(writes[0].path).toMatch(/^restaurantCandidates\/pizza-palace-/);
  });

  it('does not reuse verified, merged, or dismissed candidates as pending duplicates', async () => {
    seed['bites'] = [
      biteDoc('bite-1', 'Pizza Palace', nearby(1)),
      biteDoc('bite-2', 'Pizza Palace', nearby(2)),
      biteDoc('bite-3', 'Pizza Palace', nearby(3)),
      biteDoc('bite-4', 'Pizza Palace', nearby(4)),
    ];
    seed['restaurantCandidates'] = ['verified', 'merged', 'dismissed'].map(
      (status) => ({
        id: `candidate-${status}`,
        data: {
          name: 'Pizza Palace',
          normalizedName: 'pizza palace',
          status,
          position: nearby(1),
          geohash: 'geohash-1',
          biteIds: ['bite-existing'],
          evidence: { biteCount: 1, placeNames: { 'Pizza Palace': 1 } },
        },
      }),
    );

    await runTrigger('bite-new', { place: 'Pizza Palace', position: CENTER });

    expect(writes).toHaveLength(1);
    expect(writes[0].path).toMatch(/^restaurantCandidates\/pizza-palace-/);
    expect(writes[0].path).not.toContain('candidate-');
  });

  it('ignores bites without a place name or position', async () => {
    await runTrigger('bite-new', { place: '   ' });

    expect(firestoreMock.collection).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
});
