import type { Geopoint } from './geopoint';
import type { Like } from './like';

export interface Bite {
  userId?: string;
  id: string;
  name: string;
  image: string;
  imagePath?: string;
  imageStatus?: 'pending' | 'uploaded' | 'failed';
  place: string;
  price: number;
  currency?: string;
  position: Geopoint;
  geohash?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  formatted?: string;
  addressStatus?: 'pending' | 'resolved' | 'failed';
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
  thumbup?: number;
  drooling?: number;
  mindblown?: number;
  priceInPreferredCurrency?: number;
  priceInPreferredCurrencySymbol?: string;
}
