import { HttpsError } from 'firebase-functions/https';
import * as admin from 'firebase-admin';
import { onAppCheck } from '../shared/callable-options';
import {
  getString,
  getStringArray,
  toSearchBite,
} from '../shared/utils/search-bite';

const MIN_SEARCH_TEXT_LENGTH = 3;
const MAX_RESULTS = 20;

interface SearchBitesRequest {
  searchText?: unknown;
}

const matchesSearchText = (value: string, searchText: string): boolean =>
  value.toLocaleLowerCase().includes(searchText);

export const searchBites = onAppCheck<SearchBitesRequest>(async (request) => {
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
