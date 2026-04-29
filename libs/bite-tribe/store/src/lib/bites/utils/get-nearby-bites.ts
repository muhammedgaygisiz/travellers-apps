import { Bite } from 'model';

const FIFTEEN_KM = 15;

export const getNearbyBites = (bites: Bite[]): Bite[] =>
  bites.filter((bite) => {
    const distance = bite.distance ? parseFloat(bite.distance) : Infinity;
    return distance <= FIFTEEN_KM;
  });
