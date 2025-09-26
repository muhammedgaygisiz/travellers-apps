import { Bite, Restaurant } from 'model';

export const getDistance = (
  restaurant?: Restaurant,
  bite?: Bite
): string | undefined => {
  const restaurantDistance = restaurant?.distance;
  if (restaurantDistance && restaurantDistance !== 'NaN') {
    return restaurantDistance;
  }

  return bite?.distance;
};
