import { Geopoint } from './geopoint';

export interface Bite {
  id: string;
  name: string;
  image: string;
  place: string;
  price: number;
  currency?: string;
  position: Geopoint;
  distance?: string;
  restaurantId?: string;

  likes?: any[];
  thumbup: number;
  drooling: number;
  mindblown: number;

  tags?: string[];
}
