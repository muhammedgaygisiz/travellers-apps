import type { PublicUser } from 'model';

export type SearchCategory = 'user' | 'bite' | 'restaurant';

export interface SearchBite {
  id: string;
  name: string;
  place: string;
  image?: string;
  imagePath?: string;
  description?: string;
  tags?: string[];
}

export interface SearchRestaurant {
  id: string;
  name: string;
  biteId: string;
  restaurantId?: string;
  place?: string;
  image?: string;
  imagePath?: string;
}

export type SearchResult =
  | { category: 'user'; value: PublicUser }
  | { category: 'bite'; value: SearchBite }
  | { category: 'restaurant'; value: SearchRestaurant };
