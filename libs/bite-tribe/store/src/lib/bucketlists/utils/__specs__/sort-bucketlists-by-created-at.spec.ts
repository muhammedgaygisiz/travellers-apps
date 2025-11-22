import { sortBucketlistsByCreatedAt } from '../sort-bucketlists-by-created-at';
import { Bucketlist } from 'model';

describe('sortBucketlistsByCreatedAt', () => {
  it('should sort bucketlists by createdAt in descending order', () => {
    const bucketlists = [
      { id: 1, createdAt: '2024-06-01T10:00:00Z' } as unknown as Bucketlist,
      { id: 2, createdAt: '2024-06-03T10:00:00Z' } as unknown as Bucketlist,
      { id: 3, createdAt: '2024-06-02T10:00:00Z' } as unknown as Bucketlist,
    ];

    const sorted = sortBucketlistsByCreatedAt(bucketlists);

    expect(sorted[0].id).toBe(2);
    expect(sorted[1].id).toBe(3);
    expect(sorted[2].id).toBe(1);
  });

  it('should handle bucketlists with missing createdAt', () => {
    const bucketlists = [
      { id: 1, createdAt: '2024-06-01T10:00:00Z' } as unknown as Bucketlist,
      { id: 2 } as unknown as Bucketlist,
      { id: 3, createdAt: '2024-06-02T10:00:00Z' } as unknown as Bucketlist,
    ];

    const sorted = sortBucketlistsByCreatedAt(bucketlists);

    expect(sorted[0].id).toBe(3);
    expect(sorted[1].id).toBe(1);
    expect(sorted[2].id).toBe(2);
  });

  it('should handle null or undefined bucketlists in array', () => {
    const bucketlists = [
      { id: 1, createdAt: '2024-06-01T10:00:00Z' } as unknown as Bucketlist,
      null as unknown as Bucketlist,
      { id: 3, createdAt: '2024-06-02T10:00:00Z' } as unknown as Bucketlist,
    ];

    const sorted = sortBucketlistsByCreatedAt(bucketlists);

    expect(sorted[0].id).toBe(3);
    expect(sorted[1].id).toBe(1);
    expect(sorted[2]).toBeNull();
  });

  it('should handle null or undefined for all bucketlists in array', () => {
    const bucketlists = [
      null as unknown as Bucketlist,
      null as unknown as Bucketlist,
    ];

    const sorted = sortBucketlistsByCreatedAt(bucketlists);

    expect(sorted).toEqual(bucketlists);
  });

  it('should handle empty array', () => {
    const bucketlists: Bucketlist[] = [];

    const sorted = sortBucketlistsByCreatedAt(bucketlists);

    expect(sorted).toEqual([]);
  });
});
