import { loadBitesByBucketlist } from '../load-bites-by-bucketlist';
import { Bite, Bucketlist } from 'model';
import { loadBiteById } from '../load-bite-by-id';

jest.mock('../load-bite-by-id', () => ({
  loadBiteById: jest.fn(),
}));

describe('loadBitesByBucketlist', () => {
  beforeEach(() => {
    (loadBiteById as jest.Mock).mockClear();
  });

  describe('given bite ids in bucketlist', () => {
    it('should call loadBiteById for each bite id', async () => {
      await loadBitesByBucketlist(
        {
          biteIds: ['bite1', 'bite2', 'bite3'],
        } as Bucketlist,
        'viewer',
      );

      expect(loadBiteById).toHaveBeenCalledTimes(3);
    });
  });

  describe('given not bites in bucketlist', () => {
    it('should not call loadBiteById and return empty array', async () => {
      const result = await loadBitesByBucketlist(
        {
          biteIds: [],
        } as unknown as Bucketlist,
        'viewer',
      );

      expect(loadBiteById).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    describe('with bite ids undefined', () => {
      it('should not call loadBiteById and return empty array', async () => {
        const result = await loadBitesByBucketlist(
          {
            // biteIds is undefined
          } as unknown as Bucketlist,
          'viewer',
        );

        expect(loadBiteById).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });
  });

  /**
   * What each id resolves to, standing in for Firestore. A missing document
   * resolves the way `toBite` builds it - an id and nothing else.
   */
  const resolving = (bites: Record<string, Partial<Bite>>): void => {
    (loadBiteById as jest.Mock).mockImplementation(async (id: string) => ({
      id,
      likes: [],
      ...bites[id],
    }));
  };

  const stored = (overrides: Partial<Bite> = {}): Partial<Bite> => ({
    name: 'Margherita',
    userId: 'poster',
    imageStatus: 'uploaded',
    ...overrides,
  });

  const list = { biteIds: ['listed', 'failed', 'missing'] } as Bucketlist;

  describe('given a Bite whose photo is not uploaded', () => {
    beforeEach(() =>
      resolving({
        listed: stored(),
        failed: stored({ imageStatus: 'failed' }),
      }),
    );

    it("hides it from everybody else, the list's owner included", async () => {
      const result = await loadBitesByBucketlist(list, 'list-owner');

      expect(result.map((bite) => bite.id)).toEqual(['listed']);
    });

    it('shows it to its creator', async () => {
      const result = await loadBitesByBucketlist(list, 'poster');

      expect(result.map((bite) => bite.id)).toEqual(['listed', 'failed']);
    });
  });

  it('drops an id that resolves to no document', async () => {
    resolving({ listed: stored() });

    const result = await loadBitesByBucketlist(list, 'poster');

    expect(result.map((bite) => bite.id)).toEqual(['listed']);
  });
});
