import type { Geopoint } from './geopoint';
import type { Bite } from './bite';
import type { Link } from './link';
import type { DaySchedule } from './opening-hours';
import type { Address } from './address';
import type { TableOrderingSettings } from './table-ordering';

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

export interface Restaurant {
  id: string;
  name: string;
  distance?: string;
  image?: string;
  imagePath?: string;
  position: Geopoint;
  address?: Address;

  menuId?: string;

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

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
