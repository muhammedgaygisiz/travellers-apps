import { getFirestore } from 'firebase-admin/firestore';
import { searchBites } from '../search-bites';
import type { SearchBite } from '../../shared/utils/search-bite';

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

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

type SearchBitesHandler = (request: {
  auth?: { uid: string };
  data: { searchText?: unknown };
}) => Promise<SearchBite[]>;

const handler = searchBites as unknown as SearchBitesHandler;

const biteDoc = (
  id: string,
  overrides: Record<string, unknown> = {},
): { id: string; data: () => Record<string, unknown> } => ({
  id,
  data: () => ({
    id,
    name: `Pizza ${id}`,
    place: 'Da Mario',
    userId: 'poster',
    imageStatus: 'uploaded',
    ...overrides,
  }),
});

const mockBites = (docs: ReturnType<typeof biteDoc>[]): void => {
  (getFirestore as jest.Mock).mockReturnValue({
    collection: jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({ docs }),
    }),
  });
};

describe('searchBites', () => {
  afterEach(() => jest.clearAllMocks());

  const docs = (): ReturnType<typeof biteDoc>[] => [
    biteDoc('listed'),
    biteDoc('failed', { imageStatus: 'failed' }),
    biteDoc('legacy', { imageStatus: undefined }),
  ];

  it('returns a non-listable Bite to nobody but its creator', async () => {
    mockBites(docs());

    const result = await handler({
      auth: { uid: 'viewer' },
      data: { searchText: 'pizza' },
    });

    expect(result.map((bite) => bite.id)).toEqual(['listed']);
  });

  it('returns the creator every match of their own', async () => {
    mockBites(docs());

    const result = await handler({
      auth: { uid: 'poster' },
      data: { searchText: 'pizza' },
    });

    expect(result.map((bite) => bite.id)).toEqual([
      'listed',
      'failed',
      'legacy',
    ]);
  });

  /** Hidden matches must not use up the cap (GitHub issue #1717). */
  it('filters before capping the result', async () => {
    const hidden = Array.from({ length: 20 }, (_, i) =>
      biteDoc(`hidden-${i}`, { imageStatus: 'failed' }),
    );
    mockBites([...hidden, biteDoc('listed')]);

    const result = await handler({
      auth: { uid: 'viewer' },
      data: { searchText: 'pizza' },
    });

    expect(result.map((bite) => bite.id)).toEqual(['listed']);
  });

  /** GitHub issue #1609. */
  it('leaves out the Bites of an account the caller blocked', async () => {
    const blockedList = {
      get: jest.fn().mockResolvedValue({ docs: [{ id: 'poster' }] }),
    };

    (getFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn((name: string) =>
        name === 'users'
          ? {
              doc: (): { collection: () => typeof blockedList } => ({
                collection: (): typeof blockedList => blockedList,
              }),
            }
          : {
              get: jest.fn().mockResolvedValue({
                docs: [
                  biteDoc('blocked'),
                  biteDoc('other', { userId: 'someone-else' }),
                ],
              }),
            },
      ),
    });

    const result = await handler({
      auth: { uid: 'viewer' },
      data: { searchText: 'pizza' },
    });

    expect(result.map((bite) => bite.id)).toEqual(['other']);
  });
});
