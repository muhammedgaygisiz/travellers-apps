import { Injectable } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { SearchBite } from 'model';

/**
 * The shortest term `searchBites` will act on, and the most results it will
 * return.
 *
 * Both are the callable's numbers, restated here so the UI can say why it did
 * nothing rather than showing an empty list for a two-character term. Changing
 * either would mean changing the callable, which would change the consumer
 * app's search — out of scope for issue #1476, and recorded as a known limit on
 * the operator surface instead.
 */
export const MIN_SEARCH_TEXT_LENGTH = 3;
export const MAX_RESULTS = 20;

interface SearchBitesRequest {
  searchText: string;
}

/**
 * The Bite search behind the admin app's Bite lookup.
 *
 * It calls `searchBites` — the same callable the consumer app's search drives —
 * rather than reading `/bites` itself or gaining a callable of its own. The
 * matching is backend-owned and there is no reason for an operator to get a
 * second answer to the same question (epic #1471).
 *
 * What could **not** be reused is the UI. `libs/bite-tribe/search/page` and
 * `libs/bite-tribe/search/data-access` are tagged `scope:bite-tribe`, and the
 * `depConstraints` entry for `scope:bite-tribe-admin` in `eslint.config.mjs`
 * does not permit `type:feature` or `type:data-access` from another scope. That
 * boundary was added in #1317 after the business app drifted into the consumer
 * app's feature-local data-access, so this service is a deliberate thin
 * duplicate of one call rather than a shortcut past a lint rule.
 *
 * Not a `resource`, unlike the account list: this loads on a submitted term
 * rather than on page entry, and the page owns when that happens.
 */
@Injectable({ providedIn: 'root' })
export class BiteSearchDataAccessService {
  /**
   * Searches Bites by name or tag.
   *
   * A term shorter than the minimum returns nothing without calling, which is
   * what the callable would do anyway. Doing it here means the page can tell
   * the operator the term is too short instead of showing them "no results".
   *
   * Errors are not swallowed, unlike the consumer app's search resource. An
   * operator acting on a report needs to know the search failed rather than
   * conclude the Bite does not exist.
   */
  async search(searchText: string): Promise<SearchBite[]> {
    const term = searchText.trim();

    if (term.length < MIN_SEARCH_TEXT_LENGTH) {
      return [];
    }

    const { data } = await FirebaseFunctions.callByName<
      SearchBitesRequest,
      SearchBite[]
    >({ name: 'searchBites', data: { searchText: term } });

    return data ?? [];
  }
}
