/**
 * How much of a bucket list has been tried out, from 0 to 1.
 *
 * The bucket lists page draws its progress bar and its "done" mark from this,
 * and the store celebrates the tick that brings it to 1 (issue #1800), so the
 * two cannot disagree about when a list is complete. An empty list is never
 * complete.
 */
export const bucketlistProgress = (
  bucketlist:
    | { biteIds?: readonly string[]; triedOutBites?: readonly unknown[] }
    | null
    | undefined,
): number => {
  const total = bucketlist?.biteIds?.length ?? 0;

  if (total === 0) {
    return 0;
  }

  const triedOut = bucketlist?.triedOutBites?.length ?? 0;

  return triedOut / total;
};
