import { Bite, Restaurant } from 'model';

export const getDistance = (
  restaurant?: Pick<Restaurant, 'distance'>,
  bite?: Pick<Bite, 'distance'>,
): string | undefined => {
  const restaurantDistance = restaurant?.distance;
  if (restaurantDistance && restaurantDistance !== 'NaN') {
    return restaurantDistance;
  }

  return bite?.distance;
};
