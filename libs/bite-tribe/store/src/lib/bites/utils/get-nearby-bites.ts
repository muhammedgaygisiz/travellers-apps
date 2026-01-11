import { Bite } from 'model';

const ONE_KM = 1;

export const getNearbyBites = (bites: Bite[]): Bite[] =>
  bites.filter((bite) => {
    const distance = bite.distance ? parseFloat(bite.distance) : Infinity;
    return distance <= ONE_KM;
  });
