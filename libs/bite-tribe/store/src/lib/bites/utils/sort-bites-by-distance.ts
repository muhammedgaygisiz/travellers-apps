import { Bite } from 'model';

export const sortBitesByDistance = (bites: Bite[]): Bite[] => {
  return bites.sort((a, b) => {
    if (!a || !b) {
      return 1;
    }
    if (!a.distance && b.distance) {
      return 1;
    }
    if (a.distance && !b.distance) {
      return -1;
    }
    if (!a.distance && !b.distance) {
      return 1;
    }
    return Number(a.distance) - Number(b.distance);
  });
};
