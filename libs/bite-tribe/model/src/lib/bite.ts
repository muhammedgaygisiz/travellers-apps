import { Geopoint } from './geopoint';

export interface Bite {
  userId?: string;
  id: string;
  name: string;
  image: string;
  place: string;
  price: number;
  currency?: string;
  position: Geopoint;
  restaurantId?: string;
  tags?: string[];

  createdAt?: string;
  createdAtTimestamp?: number;
  updatedAt?: string;
  updatedAtTimestamp?: number;

  //derived attribute
  distance?: string;
  likes?: any[];
}
