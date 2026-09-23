import type { Geopoint } from './geopoint';
import type { Like } from './like';
import type { PositionSource } from './position-source';

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
  /**
   * Which source produced {@link position}. Null on Bites written before the
   * source was recorded, which the form reports as an unknown source rather
   * than guessing. See GitHub issue #1266.
   */
  positionSource?: PositionSource | null;
  geohash?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  formatted?: string;
  addressStatus?: 'pending' | 'resolved' | 'failed';
  restaurantId?: string;
  /**
   * The meal this Bite was made from (GitHub issue #1112).
   *
   * Present only on a Bite created from a visit summary, and absent on every
   * other one - which is most of them. It is what lets the nightly reminder
   * know a meal has already become a Bite and stop asking, and it is
   * deliberately **not** the menu-item link: that is `menuItemId`, it points
   * at the dish rather than at the evening, and it is issue #1113's.
   *
   * It says nothing to other readers. A Bite made this way is an ordinary
   * Bite, better sourced.
   */
  visitId?: string;
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
