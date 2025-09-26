import { Bite, Geopoint, Restaurant } from 'model';

export const getPosition = (
  restaurant?: Restaurant,
  bite?: Bite
): Geopoint | null | undefined => {
  if (restaurant?.position) {
    return restaurant?.position;
  }

  if (bite?.position) {
    return bite?.position;
  }

  return null;
};
