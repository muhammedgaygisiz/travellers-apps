import { loadBitesByBucketlist } from '../load-bites-by-bucketlist';
import { Bucketlist } from 'model';
import { loadBiteById } from '../load-bite-by-id';

jest.mock('../load-bite-by-id', () => ({
  loadBiteById: jest.fn(),
}));

describe('loadBitesByBucketlist', () => {
  it('should call loadBiteById for each bite id', async () => {
    await loadBitesByBucketlist({
      biteIds: ['bite1', 'bite2', 'bite3'],
    } as Bucketlist);

    expect(loadBiteById).toHaveBeenCalledTimes(3);
  });
});
