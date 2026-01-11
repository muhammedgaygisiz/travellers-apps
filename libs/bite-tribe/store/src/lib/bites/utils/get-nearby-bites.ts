import { Bite } from 'model';

export const getNearbyBites = (allBites: Bite[]): Bite[] =>
  allBites.filter((bite) => {
    const distance = bite.distance ? parseFloat(bite.distance) : Infinity;
    return distance <= 1; // 1km
  });
