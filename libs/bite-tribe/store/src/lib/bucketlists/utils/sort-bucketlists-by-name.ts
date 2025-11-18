import { Bucketlist } from 'model';

export const sortBucketlistsByName = (
  bucketlists: Bucketlist[],
): Bucketlist[] => {
  return bucketlists.sort((a: Bucketlist, b: Bucketlist) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  });
};
