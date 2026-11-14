import type { PublicUser } from './public-user';
import type { Geopoint } from './geopoint';

/**
 * Three categories since GitHub issue #2026: Bites search reads a Bite's name,
 * restaurant, city, tags and description, so the former Restaurant and City
 * categories folded into it. Country keeps its own exact-code picker search.
 */
export type SearchCategory = 'user' | 'bite' | 'country';

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
  /** The author, absent on an anonymised Bite (GitHub issue #1609). */
  userId?: string;
}

export type SearchResult =
  | { category: 'user'; value: PublicUser }
  | { category: 'bite'; value: SearchBite }
  | { category: 'country'; value: SearchBite };
