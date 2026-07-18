import { sortByCriteria } from '../sort-by-criteria';
import type { sortBucketlistsByName } from '../sort-bucketlists-by-name';
import type { sortBucketlistsByCreatedAt } from '../sort-bucketlists-by-created-at';

const sortBucketlistsByNameMock = jest.fn();
jest.mock('../sort-bucketlists-by-name', () => ({
  sortBucketlistsByName: (
    ...args: Parameters<typeof sortBucketlistsByName>
  ): ReturnType<typeof sortBucketlistsByName> =>
    sortBucketlistsByNameMock(...args),
}));

const sortBucketlistsByCreatedAtMock = jest.fn();
jest.mock('../sort-bucketlists-by-created-at', () => ({
  sortBucketlistsByCreatedAt: (
    ...args: Parameters<typeof sortBucketlistsByCreatedAt>
  ): ReturnType<typeof sortBucketlistsByCreatedAt> =>
    sortBucketlistsByCreatedAtMock(...args),
}));

describe('sortByCriteria', () => {
  it('should return empty array when input is undefined', () => {
    const result = sortByCriteria(
      undefined as unknown as Parameters<typeof sortByCriteria>[0],
      'name',
    );
    expect(result).toEqual([]);
  });

  it('should return empty array when input is null', () => {
    const result = sortByCriteria(
      null as unknown as Parameters<typeof sortByCriteria>[0],
      'name',
    );
    expect(result).toEqual([]);
  });

  it('should return the same array when input is empty', () => {
    const result = sortByCriteria([], 'name');
    expect(result).toEqual([]);
  });

  it('should return the same array when sorting criteria is not provided', () => {
    const bucketlists = [{ name: 'A' }, { name: 'B' }];
    const result = sortByCriteria(
      bucketlists as unknown as Parameters<typeof sortByCriteria>[0],
      '',
    );
    expect(result).toEqual(bucketlists);
  });

  it('should call sortBucketlistsByName when sorting by name', () => {
    const bucketlists = [{ name: 'B' }, { name: 'A' }];
    sortBucketlistsByNameMock.mockReturnValue([{ name: 'A' }, { name: 'B' }]);

    const result = sortByCriteria(
      bucketlists as unknown as Parameters<typeof sortByCriteria>[0],
      'name',
    );

    expect(sortBucketlistsByNameMock).toHaveBeenCalledWith(bucketlists);
    expect(result).toEqual([{ name: 'A' }, { name: 'B' }]);
  });

  it('should call sortBucketlistsByCreatedAt when sorting by createdAt', () => {
    const bucketlists = [
      { createdAt: '2021-01-02' },
      { createdAt: '2021-01-01' },
    ];
    sortBucketlistsByCreatedAtMock.mockReturnValue([
      { createdAt: '2021-01-01' },
      { createdAt: '2021-01-02' },
    ]);

    const result = sortByCriteria(
      bucketlists as unknown as Parameters<typeof sortByCriteria>[0],
      'createdAt',
    );

    expect(sortBucketlistsByCreatedAtMock).toHaveBeenCalledWith(bucketlists);
    expect(result).toEqual([
      { createdAt: '2021-01-01' },
      { createdAt: '2021-01-02' },
    ]);
  });

  it('should return the same array when sorting criteria is unrecognized', () => {
    const bucketlists = [{ name: 'A' }, { name: 'B' }];
    const result = sortByCriteria(
      bucketlists as unknown as Parameters<typeof sortByCriteria>[0],
      'unknown',
    );
    expect(result).toEqual(bucketlists);
  });
});
