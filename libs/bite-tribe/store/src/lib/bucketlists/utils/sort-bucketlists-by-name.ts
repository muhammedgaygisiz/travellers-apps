import { Bucketlist } from 'model';

export const sortBucketlistsByName = (
  bucketlists: Bucketlist[],
): Bucketlist[] => {
  return [...bucketlists].sort((a: Bucketlist, b: Bucketlist) =>
    a.name.localeCompare(b.name),
  );
};
