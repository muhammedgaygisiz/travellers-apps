import { getFirestore } from 'firebase-admin/firestore';
import { searchUsers } from '../search-users';

jest.mock('firebase-functions/https', () => ({
  HttpsError: class HttpsError extends Error {},
}));

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

type SearchUsersHandler = (request: {
  auth?: { uid: string };
  data: { searchText?: unknown };
}) => Promise<{ userId: string }[]>;

const handler = searchUsers as unknown as SearchUsersHandler;

const mockUser = (fields: Record<string, unknown>): void => {
  const get = jest.fn().mockResolvedValue({
    docs: [{ id: 'match', data: () => ({ public: true, ...fields }) }],
  });

  (getFirestore as jest.Mock).mockReturnValue({
    collection: jest.fn().mockReturnValue({
      get,
      doc: () => ({
        collection: () => ({
          get: jest.fn().mockResolvedValue({ docs: [] }),
        }),
      }),
    }),
  });
};

const search = (searchText: string): Promise<{ userId: string }[]> =>
  handler({ auth: { uid: 'viewer' }, data: { searchText } });

/** GitHub issue #1882. */
describe('searchUsers', () => {
  afterEach(() => jest.clearAllMocks());

  it('searches from two characters and not from one', async () => {
    mockUser({ displayName: 'Mo' });

    await expect(search('m')).resolves.toEqual([]);
    expect((await search('mo')).map((user) => user.userId)).toEqual(['match']);
  });

  it.each([
    ['displayName', 'さくら', 'サクラ'],
    ['fullName', 'ｻｸﾗ', 'さくら'],
    ['email', 'ＳＡＫＵＲＡ', 'sakura@example.com'],
  ])('folds kana and width in %s', async (field, searchText, stored) => {
    mockUser({ [field]: stored });

    expect((await search(searchText)).map((user) => user.userId)).toEqual([
      'match',
    ]);
  });
});
