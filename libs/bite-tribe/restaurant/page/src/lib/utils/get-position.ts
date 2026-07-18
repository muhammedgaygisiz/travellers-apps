import { Bite, Geopoint, Restaurant } from 'model';

export const getPosition = (
  restaurant?: Partial<Pick<Restaurant, 'position'>>,
  bite?: Partial<Pick<Bite, 'position'>>,
): Geopoint | null | undefined => {
  if (restaurant?.position) {
    return restaurant.position;
  }

  if (bite?.position) {
    return bite.position;
  }

  return null;
};
