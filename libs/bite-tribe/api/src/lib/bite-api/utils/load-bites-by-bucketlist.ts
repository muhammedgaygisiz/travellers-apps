import { Bite, Bucketlist, isBiteVisibleTo } from 'model';
import { loadBiteById } from './load-bite-by-id';

/**
 * Whether an id resolved to a stored Bite at all.
 *
 * `loadBiteById` answers a missing document with `{ id, likes: [] }` rather
 * than nothing - `toBite` spreads a null `data` - so a truthiness check lets
 * a deleted Bite through as a blank card. `name` is required on every stored
 * Bite, which makes it the field to check.
 */
const isStoredBite = (bite: Bite | undefined): bite is Bite =>
  !!bite && typeof bite.name === 'string';

/**
 * The Bites of one bucket list that this viewer may see.
 *
 * A bucket list keeps the id of a Bite that has since become non-listable, or
 * has been deleted, and nothing rewrites `biteIds`; the read is where they are
 * hidden (GitHub issue #1717). A non-listable Bite is shown to its creator
 * alone - not to the list's owner - and the count a list displays has to come
 * from this result rather than from `biteIds.length`.
 */
export const loadBitesByBucketlist = async (
  bucketlist: Bucketlist,
  viewerUid: string | undefined,
): Promise<Bite[]> => {
  const biteIds = bucketlist.biteIds || [];

  if (biteIds.length === 0) {
    return [];
  }

  const promises = biteIds.map(async (id) => {
    return await loadBiteById(id);
  });

  const bites = await Promise.all(promises);
  return bites.filter(
    (bite): bite is Bite =>
      isStoredBite(bite) && isBiteVisibleTo(bite, viewerUid),
  );
};
