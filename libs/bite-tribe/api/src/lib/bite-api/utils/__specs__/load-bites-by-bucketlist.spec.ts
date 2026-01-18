import { loadBitesByBucketlist } from '../load-bites-by-bucketlist';
import { Bucketlist } from 'model';
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
      await loadBitesByBucketlist({
        biteIds: ['bite1', 'bite2', 'bite3'],
      } as Bucketlist);

      expect(loadBiteById).toHaveBeenCalledTimes(3);
    });
  });

  describe('given not bites in bucketlist', () => {
    it('should not call loadBiteById and return empty array', async () => {
      const result = await loadBitesByBucketlist({
        biteIds: [],
      } as unknown as Bucketlist);

      expect(loadBiteById).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    describe('with bite ids undefined', () => {
      it('should not call loadBiteById and return empty array', async () => {
        const result = await loadBitesByBucketlist({
          // biteIds is undefined
        } as unknown as Bucketlist);

        expect(loadBiteById).not.toHaveBeenCalled();
        expect(result).toEqual([]);
      });
    });
  });
});
