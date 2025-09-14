import { Geopoint } from './geopoint';
import { Like } from './like';

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
  restaurantId?: string;
  tags?: string[];
  rating?: number;

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
