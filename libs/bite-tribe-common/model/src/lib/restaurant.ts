import type { Geopoint } from './geopoint';
import type { Bite } from './bite';
import type { Link } from './link';
import type { DaySchedule } from './opening-hours';
import type { Address } from './address';

export type RestaurantClaimStatus =
  'unclaimed' | 'pending' | 'claimed' | 'disputed' | 'revoked';

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

  ownerUserId?: string;
  claimStatus?: RestaurantClaimStatus;
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
