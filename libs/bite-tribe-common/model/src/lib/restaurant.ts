import type { Geopoint } from './geopoint';
import type { Bite } from './bite';
import type { Link } from './link';
import type { DaySchedule } from './opening-hours';
import type { Address } from './address';

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

  socialMediaLinks?: Link[];
  description?: string;
  openingHours?: DaySchedule[];

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
