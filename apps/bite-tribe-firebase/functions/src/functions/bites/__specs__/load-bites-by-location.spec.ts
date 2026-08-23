import { attachCallerLikes } from '../load-bites-by-location';
import { getFirestore } from 'firebase-admin/firestore';

jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
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

jest.mock('../../shared/callable-options', () => ({
  onAppCheck: jest.fn((handler) => handler),
}));

const userId = 'user1';

const likeDoc = (biteId: string, likeType: string): unknown => ({
  exists: true,
  ref: { parent: { parent: { id: biteId } } },
  data: () => ({ biteId, userId, likeType }),
});

const missingDoc = (biteId: string): unknown => ({
  exists: false,
  ref: { parent: { parent: { id: biteId } } },
  data: () => undefined,
});

const firestoreReturning = (...documents: unknown[]): { getAll: jest.Mock } => {
  const firestore = {
    doc: jest.fn((path: string) => ({ path })),
    getAll: jest.fn(async () => documents),
  };
  (getFirestore as jest.Mock).mockReturnValue(firestore);
  return firestore as unknown as { getAll: jest.Mock };
};

describe('attachCallerLikes', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns an empty feed untouched without reading', async () => {
    const firestore = firestoreReturning();

    expect(await attachCallerLikes([], userId)).toEqual([]);
    expect(firestore.getAll).not.toHaveBeenCalled();
  });

  it("attaches the caller's like to the matching bite", async () => {
    firestoreReturning(likeDoc('bite1', 'drooling'), missingDoc('bite2'));

    const result = await attachCallerLikes(
      [
        { id: 'bite1', likes: [] },
        { id: 'bite2', likes: [] },
      ],
      userId,
    );

    expect(result[0].likes).toEqual([
      { biteId: 'bite1', userId, likeType: 'drooling' },
    ]);
    expect(result[1].likes).toEqual([]);
  });

  /**
   * The whole point of reading by reference rather than querying every like the
   * user ever made: cost stays tied to the feed. See GitHub issue #1357.
   */
  it('reads exactly one document per bite in the feed', async () => {
    const firestore = firestoreReturning();
    const bites = Array.from({ length: 10 }, (_, i) => ({
      id: `bite${i}`,
      likes: [],
    }));

    await attachCallerLikes(bites, userId);

    expect(firestore.getAll).toHaveBeenCalledTimes(1);
    expect(firestore.getAll.mock.calls[0]).toHaveLength(10);
  });

  it('returns the feed without likes when the read fails', async () => {
    (getFirestore as jest.Mock).mockReturnValue({
      doc: jest.fn(() => ({})),
      getAll: jest.fn(async () => {
        throw new Error('unavailable');
      }),
    });

    const bites = [{ id: 'bite1', likes: [] }];

    expect(await attachCallerLikes(bites, userId)).toEqual(bites);
  });
});
