import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/https';

const MIN_SEARCH_TEXT_LENGTH = 3;
const MAX_RESULTS = 20;

interface SearchBitesRequest {
  searchText?: unknown;
}

interface SearchBite {
  id: string;
  name: string;
  place: string;
  image?: string;
  imagePath?: string;
  description?: string;
  tags?: string[];
}

const getString = (
  data: admin.firestore.DocumentData,
  field: string,
): string => (typeof data[field] === 'string' ? data[field] : '');

const getStringArray = (
  data: admin.firestore.DocumentData,
  field: string,
): string[] => {
  const value = data[field];
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

const matchesSearchText = (value: string, searchText: string): boolean =>
  value.toLocaleLowerCase().includes(searchText);

const toSearchBite = (
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

export const searchBites = onCall<SearchBitesRequest>(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
      'unauthenticated',
      'You must be signed in to search for bites.',
    );
  }

  if (typeof request.data.searchText !== 'string') {
    throw new HttpsError('invalid-argument', 'searchText must be a string.');
  }

  const searchText = request.data.searchText.trim().toLocaleLowerCase();

  if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
    return [];
  }

  const bitesSnapshot = await admin.firestore().collection('bites').get();

  return bitesSnapshot.docs
    .filter((doc) => {
      const bite = doc.data();
      const name = getString(bite, 'name');
      const tags = getStringArray(bite, 'tags');

      return (
        matchesSearchText(name, searchText) ||
        tags.some((tag) => matchesSearchText(tag, searchText))
      );
    })
    .slice(0, MAX_RESULTS)
    .map(toSearchBite);
});
