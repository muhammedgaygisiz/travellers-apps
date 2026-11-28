import type { Geopoint } from './geopoint';
import type { Bite } from './bite';
import type { Link } from './link';
import type { DaySchedule } from './opening-hours';
import type { Address } from './address';
import type { TableOrderingSettings } from './table-ordering';
import type { RestaurantDietaryStatement } from './dietary-label';
import type { DietaryStrike } from './dietary-removal';

/**
 * What an operator's assignment can have made of a restaurant.
 *
 * A missing value means `unclaimed`: the fields are optional so every document
 * written before issue #1074 stays valid.
 *
 * `revoked` is kept apart from `unclaimed` because "it was taken away" and
 * "nobody ever held it" are different answers, and only the first one is a
 * decision somebody made.
 *
 * `pending` and `disputed` were removed with the review queue in issue #1077.
 * They existed only for the self-service claim flow of #1076, which is closed
 * as not planned: an operator assigns a restaurant directly, so nothing queues
 * and two accounts cannot both be waiting on one restaurant.
 */
export type RestaurantClaimStatus = 'unclaimed' | 'claimed' | 'revoked';

/**
 * What a restaurant says about its premises (GitHub issue #1830).
 *
 * Every field has three states: `true` is yes, `false` is no, and an absent
 * field means the restaurant has not said. Absent is never read as no - a
 * guest deciding where they can go to the toilet without being challenged is
 * owed the difference between "they told us no" and "nobody asked".
 *
 * Only the account holding the restaurant states these. A facility a guest
 * could flag would be unverifiable, and a flag like this one could be used to
 * target a venue.
 */
export interface RestaurantFacilities {
  genderNeutralRestroom?: boolean;
}

/**
 * The kind of venue a restaurant is, as the restaurant states it (GitHub issue
 * #2131). Not its cuisine: Italian or Thai stays derived from the tags on its
 * Bites. The list is fixed and recorded on the Restaurant domain page, and the
 * order here is the order the business app offers them in.
 */
export const RESTAURANT_CATEGORIES = [
  'restaurant',
  'fine-dining',
  'cafe',
  'bar',
  'pub',
  'bakery',
  'dessert',
  'street-food',
  'fast-food',
  'food-hall',
] as const;

export type RestaurantCategory = (typeof RESTAURANT_CATEGORIES)[number];

/** A hybrid such as a café that is also a bakery states both, and no more. */
export const MAX_RESTAURANT_CATEGORIES = 2;

export const isRestaurantCategory = (
  value: unknown,
): value is RestaurantCategory =>
  (RESTAURANT_CATEGORIES as readonly unknown[]).includes(value);

/**
 * The categories a restaurant states, as every reader should see them: known
 * values only, no repeats, at most `MAX_RESTAURANT_CATEGORIES`. An absent or
 * empty field is a restaurant that has not said, and reads as an empty list.
 */
export const restaurantCategoriesOf = (
  restaurant: Pick<Restaurant, 'categories'> | undefined,
): RestaurantCategory[] =>
  [
    ...new Set((restaurant?.categories ?? []).filter(isRestaurantCategory)),
  ].slice(0, MAX_RESTAURANT_CATEGORIES);

export interface Restaurant {
  id: string;
  name: string;
  distance?: string;
  image?: string;
  imagePath?: string;
  /**
   * Where a photo being uploaded has got to (GitHub issues #2126 and #2141),
   * the way `Bite.imageStatus` and `PublicUser.photoStatus` work. `imagePath`
   * keeps the previous photo until the image check passes the new one, and
   * keeps it when the check refuses it. Only `setRestaurantImagePathOnUpload`
   * writes `uploaded` and `refused`. Absent on a restaurant whose photo came
   * from candidate verification, and absent reads as settled.
   */
  imageStatus?: 'pending' | 'uploaded' | 'failed' | 'refused';
  /**
   * Why the image check refused the latest photo, present only while
   * `imageStatus` is `refused` (GitHub issue #2141).
   */
  imageRefusalCategory?: string;
  imageUploadStartedAtTimestamp?: number;
  /**
   * When the backend checks the photo again, in milliseconds since the epoch,
   * while its last image check could not run (GitHub issue #2142). Present
   * only while the photo waits; the client reads it as a photo still being
   * checked rather than an upload that stalled. Written by the backend alone.
   */
  imageCheckNextAt?: number;
  position: Geopoint;
  /**
   * The geohash of `position`, kept in step by the `keepRestaurantGeohash`
   * trigger, so Create Bite can find restaurants near a guest by range
   * (GitHub issue #2308). Never written by the apps.
   */
  geohash?: string;
  address?: Address;

  menuId?: string;
  /**
   * When an account holding the restaurant last saved its menu in the
   * business app (GitHub issue #2126). A menu verified from Bite evidence is a
   * draft - one item per dish at the average reported price - and this is what
   * says somebody who runs the restaurant has gone through it. Written only by
   * the business menu editor, never by an operator's save.
   */
  menuReviewedAt?: string;
  menuReviewedAtTimestamp?: number;

  unsaved?: boolean;
  restaurantCandidateId?: string;
  biteIds?: string[];
  bites?: Bite[];

  /**
   * Every account holding the restaurant, up to ten, absent while it is
   * unowned (epic #1614). Written only by `assignRestaurantOwner` and
   * `revokeRestaurantOwner`; the Firestore rules lock it against clients.
   */
  ownerUserIds?: string[];
  claimStatus?: RestaurantClaimStatus;
  /** When the current assignment was granted; deleted when it is revoked. */
  claimedAt?: string;
  claimedAtTimestamp?: number;

  socialMediaLinks?: Link[];
  description?: string;
  openingHours?: DaySchedule[];

  /**
   * How the restaurant offers ordering from the table (GitHub issue #1100).
   *
   * Absent on every restaurant that has never been asked, and absent reads as
   * off, so a scanned QR code at a restaurant which never opted in is refused
   * rather than starting an order nobody is watching for.
   *
   * A nested object rather than three fields, because the three are written
   * together by one surface and read together by one caller, and because
   * `openingHours` above has no time zone of its own - the zone belongs to
   * whoever has to evaluate the schedule, which is this.
   */
  tableOrdering?: TableOrderingSettings;

  /**
   * The restaurant's facilities, as the restaurant states them (GitHub issue
   * #1830). A nested object so that the next facility is a new field here
   * rather than a new top-level key - the reasoning `tableOrdering` gives.
   */
  facilities?: RestaurantFacilities;

  /**
   * What kind of venue this is, as the restaurant states it (GitHub issue
   * #2131): one or two of `RESTAURANT_CATEGORIES`. Absent is a restaurant that
   * has not said, and is never shown as a category. Read it through
   * `restaurantCategoriesOf`, which drops anything the list does not know.
   */
  categories?: RestaurantCategory[];

  /**
   * What the restaurant says about its whole kitchen (GitHub issue #2194):
   * any of `RESTAURANT_DIETARY_STATEMENTS`. Absent is a restaurant that has
   * not said. Read it through `restaurantDietaryStatementsOf`.
   *
   * Written only by the `saveRestaurantDietaryStatements` callable, together
   * with {@link crossContaminationNote}, so the note is checked before another
   * account can read it (`RD-UR-11`); the rules refuse a client write of both.
   */
  dietaryStatements?: RestaurantDietaryStatement[];

  /**
   * The restaurant's own words on cross-contamination - a shared fryer, nuts
   * in the kitchen (GitHub issue #2194). Free text, so it goes through the
   * content check; absent when the restaurant has written none.
   */
  crossContaminationNote?: string;

  /**
   * How many guests follow the restaurant (GitHub issue #2132). Kept by the
   * backend alone; the rules refuse it from every client.
   */
  followersCount?: number;

  /**
   * Each of the restaurant's labels removed after diner reports (GitHub issue
   * #2198). Kept by the backend alone. At `DIETARY_STRIKE_LIMIT` within
   * `DIETARY_STRIKE_PERIOD_DAYS` the restaurant's new labels wait for an
   * operator (`R-8`).
   */
  dietaryStrikes?: DietaryStrike[];
  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
