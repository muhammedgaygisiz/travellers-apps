import type { Geopoint } from './geopoint';
import type { Bite } from './bite';
import type { Link } from './link';

export interface Restaurant {
  id: string;
  name: string;
  distance?: string;
  image?: string;
  imagePath?: string;
  position: Geopoint;

  menuId?: string;

  unsaved?: boolean;
  biteIds?: string[];
  bites?: Bite[];

  socialMediaLinks?: Link[];
  description?: string;

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;
}
