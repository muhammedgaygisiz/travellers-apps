import { Bite } from 'model';
import { haversineDistance } from 'utils';

export const getCloseBites = (
  sourceBite: Bite | undefined,
  bites: Bite[]
): Bite[] => {
  if (sourceBite) {
    const sourceBitePosition = sourceBite.position;

    const closeBites = bites.filter((bite) => {
      const bitePosition = bite.position;
      if (!bitePosition || !sourceBitePosition) {
        return false;
      }

      const distance = Number(
        haversineDistance(
          sourceBitePosition.latitude,
          sourceBitePosition.longitude,
          bitePosition.latitude,
          bitePosition.longitude,
          'm'
        )
      );

      return distance <= 200; // 200 meters
    });

    return closeBites || ([] as Bite[]);
  }

  return bites;
};
