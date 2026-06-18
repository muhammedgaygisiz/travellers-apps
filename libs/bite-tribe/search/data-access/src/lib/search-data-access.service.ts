import { Injectable, resource, ResourceLoader, signal } from '@angular/core';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { PublicUser } from 'model';
import type {
  SearchBite,
  SearchCategory,
  SearchRestaurant,
  SearchResult,
} from './search-result';

const MIN_SEARCH_TEXT_LENGTH = 3;

interface SearchParams {
  searchText: string;
  category: SearchCategory;
}

@Injectable({ providedIn: 'root' })
export class SearchDataAccessService {
  readonly searchText = signal('');
  readonly searchCategory = signal<SearchCategory>('user');

  resultsLoader: ResourceLoader<SearchResult[], SearchParams> = async ({
    params,
  }) => {
    if (params.searchText.length < MIN_SEARCH_TEXT_LENGTH) {
      return [];
    }

    if (params.category === 'user') {
      const result = await FirebaseFunctions.callByName<
        Omit<SearchParams, 'category'>,
        PublicUser[]
      >({
        name: 'searchUsers',
        data: { searchText: params.searchText },
      });
      return result.data.map((value) => ({ category: 'user', value }));
    }

    if (params.category === 'bite') {
      const result = await FirebaseFunctions.callByName<
        Omit<SearchParams, 'category'>,
        SearchBite[]
      >({
        name: 'searchBites',
        data: { searchText: params.searchText },
      });
      return result.data.map((value) => ({ category: 'bite', value }));
    }

    const result = await FirebaseFunctions.callByName<
      Omit<SearchParams, 'category'>,
      SearchRestaurant[]
    >({
      name: 'searchRestaurants',
      data: { searchText: params.searchText },
    });
    return result.data.map((value) => ({ category: 'restaurant', value }));
  };

  readonly results = resource({
    params: () => ({
      searchText: this.searchText().trim(),
      category: this.searchCategory(),
    }),
    loader: this.resultsLoader.bind(this),
    defaultValue: [],
  });
}
