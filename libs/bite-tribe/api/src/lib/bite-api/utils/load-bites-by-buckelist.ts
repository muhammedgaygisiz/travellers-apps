import { Bite, Bucketlist } from 'model';
import { loadBiteById } from './load-bite-by-id';

export const loadBitesByBuckelist = async (
  bucketlist: Bucketlist,
): Promise<Bite[]> => {
  const biteIds = bucketlist.biteIds || [];

  if (biteIds.length === 0) {
    return [];
  }

  const promises = biteIds.map(async (id) => {
    return await loadBiteById(id);
  });

  const bites = await Promise.all(promises);
  return bites.filter((b): b is Bite => !!b);
};
