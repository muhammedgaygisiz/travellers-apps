import { DocumentData, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export interface SearchBite {
  id: string;
  name: string;
  place: string;
  image?: string;
  imagePath?: string;
  description?: string;
  tags?: string[];
  position?: {
    latitude: number;
    longitude: number;
  };
  /** Feeds the rating shown inside the map marker on the client. */
  rating?: number;
  /**
   * The author, so the client can drop a result it already holds once the
   * viewer blocks them (GitHub issue #1609). Absent on an anonymised Bite.
   */
  userId?: string;
}

export const getString = (data: DocumentData, field: string): string =>
  typeof data[field] === 'string' ? data[field] : '';

export const getStringArray = (data: DocumentData, field: string): string[] => {
  const value = data[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const getPosition = (data: DocumentData): SearchBite['position'] => {
  const position = data.position;

  if (
    typeof position?.latitude !== 'number' ||
    typeof position?.longitude !== 'number'
  ) {
    return undefined;
  }

  return {
    latitude: position.latitude,
    longitude: position.longitude,
  };
};

/**
 * Ratings are optional on a Bite and a missing one has to stay missing: the
 * marker renders a plain pin for `undefined` but would print a literal "0" for
 * an unrated Bite coerced to a number.
 */
const getRating = (data: DocumentData): number | undefined =>
  typeof data.rating === 'number' && Number.isFinite(data.rating)
    ? data.rating
    : undefined;

export const toSearchBite = (doc: QueryDocumentSnapshot): SearchBite => {
  const bite = doc.data();
  const description = getString(bite, 'description');
  const image = getString(bite, 'image');
  const imagePath = getString(bite, 'imagePath');
  const tags = getStringArray(bite, 'tags');
  const position = getPosition(bite);
  const rating = getRating(bite);
  const userId = getString(bite, 'userId');

  return {
    id: getString(bite, 'id') || doc.id,
    name: getString(bite, 'name'),
    place: getString(bite, 'place'),
    ...(image ? { image } : {}),
    ...(imagePath ? { imagePath } : {}),
    ...(description ? { description } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(position ? { position } : {}),
    ...(rating !== undefined ? { rating } : {}),
    ...(userId ? { userId } : {}),
  };
};
