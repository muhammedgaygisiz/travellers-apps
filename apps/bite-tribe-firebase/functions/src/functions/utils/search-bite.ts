import * as admin from 'firebase-admin';

export interface SearchBite {
  id: string;
  name: string;
  place: string;
  image?: string;
  imagePath?: string;
  description?: string;
  tags?: string[];
}

export const getString = (
  data: admin.firestore.DocumentData,
  field: string,
): string => (typeof data[field] === 'string' ? data[field] : '');

export const getStringArray = (
  data: admin.firestore.DocumentData,
  field: string,
): string[] => {
  const value = data[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

export const toSearchBite = (
  doc: admin.firestore.QueryDocumentSnapshot,
): SearchBite => {
  const bite = doc.data();
  const description = getString(bite, 'description');
  const image = getString(bite, 'image');
  const imagePath = getString(bite, 'imagePath');
  const tags = getStringArray(bite, 'tags');

  return {
    id: getString(bite, 'id') || doc.id,
    name: getString(bite, 'name'),
    place: getString(bite, 'place'),
    ...(image ? { image } : {}),
    ...(imagePath ? { imagePath } : {}),
    ...(description ? { description } : {}),
    ...(tags.length > 0 ? { tags } : {}),
  };
};
