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
}

export const getString = (
  data: DocumentData,
  field: string,
): string => (typeof data[field] === 'string' ? data[field] : '');

export const getStringArray = (
  data: DocumentData,
  field: string,
): string[] => {
  const value = data[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const getPosition = (
  data: DocumentData,
): SearchBite['position'] => {
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

export const toSearchBite = (
  doc: QueryDocumentSnapshot,
): SearchBite => {
  const bite = doc.data();
  const description = getString(bite, 'description');
  const image = getString(bite, 'image');
  const imagePath = getString(bite, 'imagePath');
  const tags = getStringArray(bite, 'tags');
  const position = getPosition(bite);

  return {
    id: getString(bite, 'id') || doc.id,
    name: getString(bite, 'name'),
    place: getString(bite, 'place'),
    ...(image ? { image } : {}),
    ...(imagePath ? { imagePath } : {}),
    ...(description ? { description } : {}),
    ...(tags.length > 0 ? { tags } : {}),
    ...(position ? { position } : {}),
  };
};
