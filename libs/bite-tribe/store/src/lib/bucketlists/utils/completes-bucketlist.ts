import type { Bucketlist } from 'model';
import { bucketlistProgress } from 'utils';

/**
 * Whether ticking `biteId` is what completed the bucket list (issue #1800).
 *
 * Read off the list as the reducer left it: the tick is applied optimistically
 * before any effect runs, so the list before it is that list without the Bite.
 * Un-ticking never completes anything, and neither does an empty list.
 */
export const completesBucketlist = (
  bucketlist: Bucketlist | undefined,
  biteId: string,
  checked: boolean,
): boolean => {
  if (!checked || !bucketlist) {
    return false;
  }

  const before = {
    ...bucketlist,
    triedOutBites: (bucketlist.triedOutBites ?? []).filter(
      (triedOutBite) => triedOutBite.biteId !== biteId,
    ),
  };

  return bucketlistProgress(before) < 1 && bucketlistProgress(bucketlist) >= 1;
};
