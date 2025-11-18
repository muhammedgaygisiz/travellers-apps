import { Bucketlist } from 'model';

export const sortBucketlistsByCreatedAt = (
  bucketlists: Bucketlist[],
): Bucketlist[] => {
  return bucketlists.sort((a, b) => {
    if (!a || !b) {
      return 1;
    }
    if (!a.createdAt && b.createdAt) {
      return 1;
    }
    if (a.createdAt && !b.createdAt) {
      return -1;
    }
    if (!a.createdAt && !b.createdAt) {
      return 1;
    }
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });
};
