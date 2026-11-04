import { getFirestore } from 'firebase-admin/firestore';
import { searchRestaurants } from '../search-restaurants';

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {},
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

type SearchRestaurantsHandler = (request: {
  auth?: { uid: string };
  data: { searchText?: unknown };
}) => Promise<{ name: string }[]>;

const handler = searchRestaurants as unknown as SearchRestaurantsHandler;

const doc = (
  id: string,
  fields: Record<string, unknown>,
): { id: string; data: () => Record<string, unknown> } => ({
  id,
  data: () => fields,
});

const mockCollections = (
  restaurants: ReturnType<typeof doc>[],
  bites: ReturnType<typeof doc>[],
): void => {
  (getFirestore as jest.Mock).mockReturnValue({
    collection: jest.fn((name: string) => ({
      get: jest.fn().mockResolvedValue({
        docs: name === 'restaurants' ? restaurants : bites,
      }),
    })),
  });
};

const search = (searchText: string): Promise<{ name: string }[]> =>
  handler({ auth: { uid: 'viewer' }, data: { searchText } });

/** GitHub issue #1882. */
describe('searchRestaurants', () => {
  afterEach(() => jest.clearAllMocks());

  it('searches from two characters and not from one', async () => {
    mockCollections([], [doc('bite', { place: '一蘭' })]);

    await expect(search('一')).resolves.toEqual([]);
    expect((await search('一蘭')).map(({ name }) => name)).toEqual(['一蘭']);
  });

  it('folds kana and width in a restaurant name', async () => {
    mockCollections(
      [doc('kura', { name: 'ｸﾗ寿司', biteIds: ['bite'] })],
      [doc('bite', { restaurantId: 'kura', place: 'ｸﾗ寿司' })],
    );

    expect((await search('くら')).map(({ name }) => name)).toEqual(['ｸﾗ寿司']);
  });

  it('folds kana and width in a place on a Bite', async () => {
    mockCollections([], [doc('bite', { place: 'ラーメン横丁' })]);

    expect((await search('らーめん')).map(({ name }) => name)).toEqual([
      'ラーメン横丁',
    ]);
  });
});
