import { Bite } from 'model';

export const byDistance = (a: Bite, b: Bite): number => {
  if (!a.distance) {
    return 1;
  }

  if (!b.distance) {
    return -1;
  }

  return parseFloat(a.distance) - parseFloat(b.distance);
};
