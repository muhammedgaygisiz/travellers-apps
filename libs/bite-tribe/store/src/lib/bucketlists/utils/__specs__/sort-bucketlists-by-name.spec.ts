import { sortBucketlistsByName } from '../sort-bucketlists-by-name';
import type { Bucketlist } from 'model';

describe('sortBucketlistsByName', () => {
  it('should sort bucketlists by name in ascending order', () => {
    const bucketlists = [
      { id: 1, name: 'Zebra' } as unknown as Bucketlist,
      { id: 2, name: 'Apple' } as unknown as Bucketlist,
      { id: 3, name: 'Mango' } as unknown as Bucketlist,
    ];

    const sortedBucketlists = sortBucketlistsByName(bucketlists);

    expect(sortedBucketlists).toEqual([
      { id: 2, name: 'Apple' } as unknown as Bucketlist,
      { id: 3, name: 'Mango' } as unknown as Bucketlist,
      { id: 1, name: 'Zebra' } as unknown as Bucketlist,
    ]);
  });

  it('should handle an empty array', () => {
    const bucketlists: any[] = [];

    const sortedBucketlists = sortBucketlistsByName(bucketlists);

    expect(sortedBucketlists).toEqual([]);
  });

  it('should handle bucketlists with identical names', () => {
    const bucketlists = [
      { id: 1, name: 'Banana' } as unknown as Bucketlist,
      { id: 2, name: 'Apple' } as unknown as Bucketlist,
      { id: 3, name: 'Banana' } as unknown as Bucketlist,
    ];

    const sortedBucketlists = sortBucketlistsByName(bucketlists);

    expect(sortedBucketlists).toEqual([
      { id: 2, name: 'Apple' } as unknown as Bucketlist,
      { id: 1, name: 'Banana' } as unknown as Bucketlist,
      { id: 3, name: 'Banana' } as unknown as Bucketlist,
    ]);
  });
});
