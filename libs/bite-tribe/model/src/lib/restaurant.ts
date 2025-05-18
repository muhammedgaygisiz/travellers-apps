import { Geopoint } from './geopoint';

export interface Restaurant {
  id: string;
  name: string;
  distance?: string;
  image?: string;
  position: Geopoint;

  menuId?: string;

  unsaved?: boolean;
  biteIds?: string[];
}
