import type { PublicUser } from './public-user';
import type { Geopoint } from './geopoint';

export type SearchCategory =
  'user' | 'bite' | 'restaurant' | 'city' | 'country';

export interface SearchBite {
  id: string;
  name: string;
  place: string;
  image?: string;
  imagePath?: string;
  description?: string;
  tags?: string[];
  position?: Geopoint;
  /** Feeds the rating shown inside the map marker, as on every other map. */
  rating?: number;
}

export interface SearchRestaurant {
  id: string;
  name: string;
  biteId: string;
  restaurantId?: string;
  place?: string;
  image?: string;
  imagePath?: string;
  position?: Geopoint;
}

export type SearchResult =
  | { category: 'user'; value: PublicUser }
  | { category: 'bite'; value: SearchBite }
  | { category: 'restaurant'; value: SearchRestaurant }
  | { category: 'city'; value: SearchBite }
  | { category: 'country'; value: SearchBite };
