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
  /**
   * The dish on the restaurant's menu that this Bite is about
   * (GitHub issue #1113).
   *
   * Set by both paths that know it: a Bite made from an order line, and the
   * "Create Bite" button on a menu item, which has had the `MenuItem` in hand
   * since before this issue. Absent on every Bite somebody typed, which is
   * most of them.
   *
   * It is the **dish** and not the size. "Large Margherita" and "small
   * Margherita" are one thing on a menu and two things to eat, so the rating a
   * guest gave belongs to {@link variantId} while the count under the dish
   * belongs here - which is why the aggregate is kept per menu item and the
   * variant is kept on the Bite.
   *
   * A renamed dish keeps its id, so the link survives. A **deleted** one does
   * not come back, and nothing repairs the Bite: `name` and `place` were
   * copied when it was created, so it reads exactly as it did - the link goes
   * and the record stays.
   */
  menuItemId?: string;
  /**
   * Which size or variant was eaten (GitHub issue #1113).
   *
   * Absent where the dish has no variants, or where the guest chose the dish
   * itself rather than one of them. Nothing aggregates on it yet, and it is
   * here so that a per-variant view stays possible without going back through
   * every Bite - the field is cheap now and unrecoverable later.
   */
  variantId?: string;
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
