import { getFirestore } from 'firebase-admin/firestore';
import { loadBitesNearPosition } from '../search-bites-by-city';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('firebase-functions', () => ({
  logger: { info: jest.fn(), warn: jest.fn() },
}));

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {},
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: jest.fn(() => ({ value: (): string => 'key' })),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn(
    (optionsOrHandler: unknown, maybeHandler?: unknown) =>
      maybeHandler ?? optionsOrHandler,
  ),
}));

const zurich = { latitude: 47.3769, longitude: 8.5417 };

const biteDoc = (
  id: string,
  overrides: Record<string, unknown> = {},
): { id: string; data: () => Record<string, unknown> } => ({
  id,
  data: () => ({
    id,
    name: id,
    place: 'Zurich',
    userId: 'poster',
    imageStatus: 'uploaded',
    position: zurich,
    ...overrides,
  }),
});

/** Every geohash bound answers with the same documents; the first is kept. */
const mockBites = (docs: ReturnType<typeof biteDoc>[]): void => {
  const query = {
    where: jest.fn(() => query),
    orderBy: jest.fn(() => query),
    get: jest
      .fn()
      .mockResolvedValueOnce({ docs })
      .mockResolvedValue({ docs: [] }),
  };

  (getFirestore as jest.Mock).mockReturnValue({
    collection: jest.fn(() => query),
  });
};

describe('loadBitesNearPosition', () => {
  afterEach(() => jest.clearAllMocks());

  it('hides a non-listable Bite from somebody else', async () => {
    mockBites([
      biteDoc('listed'),
      biteDoc('failed', { imageStatus: 'failed' }),
      biteDoc('pending', { imageStatus: 'pending' }),
    ]);

    const result = await loadBitesNearPosition(zurich, 'viewer');

    expect(result.map((bite) => bite.id)).toEqual(['listed']);
  });

  it('returns a non-listable Bite to its creator', async () => {
    mockBites([biteDoc('failed', { imageStatus: 'failed' })]);

    const result = await loadBitesNearPosition(zurich, 'poster');

    expect(result.map((bite) => bite.id)).toEqual(['failed']);
  });

  it('filters before capping the result', async () => {
    const hidden = Array.from({ length: 20 }, (_, i) =>
      biteDoc(`hidden-${i}`, { imageStatus: 'failed' }),
    );
    mockBites([...hidden, biteDoc('listed')]);

    const result = await loadBitesNearPosition(zurich, 'viewer');

    expect(result.map((bite) => bite.id)).toEqual(['listed']);
  });
});
