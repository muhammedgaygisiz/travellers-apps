import type { Bite } from 'model';

export const dedupMerge = (
  bites: Bite[] = [],
  latestBites: Bite[] = [],
): Bite[] => {
  const allBitesWithoutLatests = bites.filter((bite) => {
    return !latestBites.find((latestBite) => latestBite.id === bite.id);
  });

  return [...latestBites, ...allBitesWithoutLatests];
};
