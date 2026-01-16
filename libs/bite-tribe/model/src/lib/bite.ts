import type { Geopoint } from './geopoint';
import type { Like } from './like';

export interface Bite {
  userId?: string;
  id: string;
  name: string;
  image: string;
  imagePath?: string;
  place: string;
  price: number;
  currency?: string;
  position: Geopoint;
  geohash?: string;
  restaurantId?: string;
  tags?: string[];
  rating?: number;
  description?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;

  //derived attribute
  distance?: string;
  likes?: Like[];
  priceInPreferredCurrency?: number;
  priceInPreferredCurrencySymbol?: string;
}
