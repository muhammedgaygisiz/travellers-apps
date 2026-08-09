import { Injectable, resource, ResourceLoader, signal } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type {
  PublicUser,
  SearchBite,
  SearchCategory,
  SearchRestaurant,
  SearchResult,
} from 'model';

const MIN_SEARCH_TEXT_LENGTH = 3;

interface SearchParams {
  searchText: string;
  category: SearchCategory;
  countryCode: string;
}

/** Payload of the four callables that search on a free-text term. */
interface SearchTextRequest {
  searchText: string;
}

/** Payload of the country callable, which matches on a picked code instead. */
interface SearchCountryRequest {
  countryCode: string;
}

@Injectable({ providedIn: 'root' })
export class SearchDataAccessService {
  readonly searchText = signal('');
  readonly searchCategory = signal<SearchCategory>('user');
  /**
   * Country search is picked, not typed, so it carries its own ISO 3166-1
   * alpha-2 code instead of reusing the free-text term.
   */
  readonly searchCountryCode = signal('');

  // Every call is caught below, so this resource never enters an error state
  // and `results.value()` is safe to read straight from the template — unlike
  // the resources audited in GitHub issue #1232.
  resultsLoader: ResourceLoader<SearchResult[], SearchParams> = async ({
    params,
  }) => {
    if (params.category === 'country') {
      if (!params.countryCode) {
        return [];
      }

      try {
        const result = await FirebaseFunctions.callByName<
          SearchCountryRequest,
          SearchBite[]
        >({
          name: 'searchBitesByCountry',
          data: { countryCode: params.countryCode },
        });
        return result.data.map((value) => ({ category: 'country', value }));
      } catch {
        return [];
      }
    }

    if (params.searchText.length < MIN_SEARCH_TEXT_LENGTH) {
      return [];
    }

    try {
      if (params.category === 'user') {
        const result = await FirebaseFunctions.callByName<
          SearchTextRequest,
          PublicUser[]
        >({
          name: 'searchUsers',
          data: { searchText: params.searchText },
        });
        return result.data.map((value) => ({ category: 'user', value }));
      }

      if (params.category === 'bite') {
        const result = await FirebaseFunctions.callByName<
          SearchTextRequest,
          SearchBite[]
        >({
          name: 'searchBites',
          data: { searchText: params.searchText },
        });
        return result.data.map((value) => ({ category: 'bite', value }));
      }

      if (params.category === 'city') {
        const result = await FirebaseFunctions.callByName<
          SearchTextRequest,
          SearchBite[]
        >({
          name: 'searchBitesByCity',
          data: { searchText: params.searchText },
        });
        return result.data.map((value) => ({ category: 'city', value }));
      }

      const result = await FirebaseFunctions.callByName<
        SearchTextRequest,
        SearchRestaurant[]
      >({
        name: 'searchRestaurants',
        data: { searchText: params.searchText },
      });
      return result.data.map((value) => ({ category: 'restaurant', value }));
    } catch {
      return [];
    }
  };

  readonly results = resource({
    params: () => ({
      searchText: this.searchText().trim(),
      category: this.searchCategory(),
      countryCode: this.searchCountryCode(),
    }),
    loader: this.resultsLoader.bind(this),
    defaultValue: [],
  });
}
