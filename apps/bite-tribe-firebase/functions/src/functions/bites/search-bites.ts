import { HttpsError } from 'firebase-functions/https';
import { getFirestore } from 'firebase-admin/firestore';
import { onAppCheck } from '../shared/callable-options';
import {
  getString,
  getStringArray,
  toSearchBite,
} from '../shared/utils/search-bite';
import { requireMember } from '../shared/roles';
import { foldSearchText } from '../shared/utils/fold-search-text';
import { isBiteVisibleTo } from '../shared/utils/bite-listability';
import { isBlockedUid, loadBlockedUids } from '../shared/utils/user-blocks';

const MIN_SEARCH_TEXT_LENGTH = 2;
const MAX_RESULTS = 20;

interface SearchBitesRequest {
  searchText?: unknown;
}

/**
 * The free-text fields a Bites search reads (GitHub issue #2026): the dish, the
 * restaurant as written on the Bite, the reverse-geocoded city and the
 * description. Tags are matched one by one beside them. Country text is left
 * out on purpose - the country picker is its search.
 */
const SEARCHABLE_FIELDS = ['name', 'place', 'city', 'description'] as const;

const matchesSearchText = (value: string, searchText: string): boolean =>
  foldSearchText(value).includes(searchText);

export const searchBites = onAppCheck<SearchBitesRequest>(async (request) => {
  requireMember(request, 'You must be signed in to search for bites.');

  if (typeof request.data.searchText !== 'string') {
    throw new HttpsError('invalid-argument', 'searchText must be a string.');
  }

  const searchText = foldSearchText(request.data.searchText.trim());

  if (searchText.length < MIN_SEARCH_TEXT_LENGTH) {
    return [];
  }

  const db = getFirestore();
  const [bitesSnapshot, blockedUids] = await Promise.all([
    db.collection('bites').get(),
    loadBlockedUids(db, request.auth.uid),
  ]);

  // Visibility is part of the match rather than a pass after it, so the cap
  // counts only Bites the caller can see (GitHub issue #1717), and not the
  // Bites of accounts the caller blocked (GitHub issue #1609).
  return bitesSnapshot.docs
    .filter((doc) => {
      const bite = doc.data();

      if (
        !isBiteVisibleTo(bite, request.auth.uid) ||
        isBlockedUid(bite['userId'], blockedUids)
      ) {
        return false;
      }

      return (
        SEARCHABLE_FIELDS.some((field) =>
          matchesSearchText(getString(bite, field), searchText),
        ) ||
        getStringArray(bite, 'tags').some((tag) =>
          matchesSearchText(tag, searchText),
        )
      );
    })
    .slice(0, MAX_RESULTS)
    .map(toSearchBite);
});
