import type { Bite } from 'model';

export const sortBitesByLikes = (bites: Bite[]): Bite[] => {
  return bites.sort((a, b) => {
    const likesA = a?.likes?.length ?? 0;
    const likesB = b?.likes?.length ?? 0;
    return likesB - likesA;
  });
};
