import type { Bite } from 'model';

export const sortBitesByRating = (bites: Bite[]): Bite[] => {
  return bites.sort((a, b) => {
    const likesA = a?.rating ?? 0;
    const likesB = b?.rating ?? 0;
    return likesB - likesA;
  });
};
