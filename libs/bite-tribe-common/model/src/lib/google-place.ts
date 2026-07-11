import type { Geopoint } from './geopoint';

export interface GooglePlace {
  placeId: string;
  name: string;
  address: string;
  position: Geopoint;
  distance?: string;
}
