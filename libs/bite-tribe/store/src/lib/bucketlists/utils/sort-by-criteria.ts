import type { Bucketlist } from 'model';
import { sortBucketlistsByCreatedAt } from './sort-bucketlists-by-created-at';
import { sortBucketlistsByName } from './sort-bucketlists-by-name';

const EMPTY_ARRAY: Bucketlist[] = [];

export const sortByCriteria = (
  bucketlists: Bucketlist[],
  sorting: string,
): Bucketlist[] => {
  if (!bucketlists?.length || !sorting) {
    return bucketlists || EMPTY_ARRAY;
  }

  if (sorting === 'name') {
    return [...sortBucketlistsByName(bucketlists)];
  }

  if (sorting === 'createdAt') {
    return [...sortBucketlistsByCreatedAt(bucketlists)];
  }

  return bucketlists || EMPTY_ARRAY;
};
