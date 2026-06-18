import { computed, inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import {
  SearchDataAccessService,
  type SearchCategory,
  type SearchResult,
} from 'bite-tribe/search-data-access';
import { PATH } from 'utils';

const MIN_SEARCH_TEXT_LENGTH = 3;

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly dataAccessService = inject(SearchDataAccessService);
  private readonly navController = inject(NavController);

  readonly results = this.dataAccessService.results;
  readonly selectedCategory = this.dataAccessService.searchCategory;
  readonly hasSearched = computed(
    () =>
      this.dataAccessService.searchText().trim().length >=
      MIN_SEARCH_TEXT_LENGTH,
  );

  search(searchText: string): void {
    this.dataAccessService.searchText.set(searchText);
  }

  selectCategory(category: SearchCategory): void {
    this.dataAccessService.searchCategory.set(category);
  }

  resultClicked(result: SearchResult): void {
    if (result.category === 'user') {
      void this.navController.navigateForward([
        PATH.PROFILE,
        result.value.userId,
      ]);
      return;
    }

    if (result.category === 'bite') {
      void this.navController.navigateForward([PATH.BITE, result.value.id]);
      return;
    }

    if (result.value.restaurantId) {
      void this.navController.navigateForward([
        PATH.BITE,
        result.value.biteId,
        PATH.RESTAURANT,
        result.value.restaurantId,
      ]);
      return;
    }

    void this.navController.navigateForward([
      PATH.BITE,
      result.value.biteId,
      PATH.RESTAURANT,
      PATH.PLACE,
      encodeURIComponent(result.value.place ?? result.value.name),
    ]);
  }
}
