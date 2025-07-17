import { Bite } from 'model';

export const getCloseBites = (
  sourceBite: Bite | undefined,
  bites: Bite[]
): Bite[] => {
  if (sourceBite) {
    // Limit the bites to those that have a haversine distance of 200 meters to the source bite
    const sourceBitePosition = sourceBite.position;
    return (
      bites.filter((bite) => {
        const bitePosition = bite.position;
        if (!bitePosition || !sourceBitePosition) {
          return false;
        }
        const distance = Math.sqrt(
          Math.pow(bitePosition.latitude - sourceBitePosition.latitude, 2) +
            Math.pow(bitePosition.longitude - sourceBitePosition.longitude, 2)
        );
        return distance <= 0.2; // 200 meters
      }) || ([] as Bite[])
    );
  }

  return bites;
};
