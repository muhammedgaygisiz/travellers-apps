import type { Geopoint } from './geopoint';
import type { Bite } from './bite';
import type { Link } from './link';
import type { DaySchedule } from './opening-hours';
import type { Address } from './address';

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

  /** The account holding the restaurant, absent while it is unowned. */
  ownerUserId?: string;
  claimStatus?: RestaurantClaimStatus;
  /** When the current assignment was granted; deleted when it is revoked. */
  claimedAt?: string;
  claimedAtTimestamp?: number;

  socialMediaLinks?: Link[];
  description?: string;
  openingHours?: DaySchedule[];

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
