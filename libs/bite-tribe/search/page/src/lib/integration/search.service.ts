import { computed, inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular/standalone';
import { SearchDataAccessService } from 'bite-tribe/search-data-access';
import type { SearchCategory, SearchResult } from 'model';
import { PATH } from 'utils';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

const MIN_SEARCH_TEXT_LENGTH = 3;

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly dataAccessService = inject(SearchDataAccessService);
  private readonly navController = inject(NavController);
  private readonly analytics = inject(AnalyticsService);

  readonly results = this.dataAccessService.results;
  readonly selectedCategory = this.dataAccessService.searchCategory;
  readonly selectedCountryCode = this.dataAccessService.searchCountryCode;
  /**
   * Country search has no minimum term to clear: picking a country is the
   * whole query, so the moment a code is set the empty state is meaningful.
   */
  readonly hasSearched = computed(() => {
    if (this.selectedCategory() === 'country') {
      return !!this.selectedCountryCode();
    }

    return (
      this.dataAccessService.searchText().trim().length >=
      MIN_SEARCH_TEXT_LENGTH
    );
  });

  search(searchText: string): void {
    const wasSearching = this.hasSearched();
    this.dataAccessService.searchText.set(searchText);

    // Emit once per search session, when the query first becomes meaningful,
    // to avoid a per-keystroke flood.
    if (!wasSearching && this.hasSearched()) {
      this.analytics.logEvent(AnalyticsEvent.SearchPerformed);
    }
  }

  selectCategory(category: SearchCategory): void {
    this.dataAccessService.searchCategory.set(category);
  }

  selectCountry(countryCode: string): void {
    const wasSearching = this.hasSearched();
    this.dataAccessService.searchCountryCode.set(countryCode);

    // Same rule as the free-text search: one event per search session, once
    // the query first becomes meaningful.
    if (!wasSearching && this.hasSearched()) {
      this.analytics.logEvent(AnalyticsEvent.SearchPerformed);
    }
  }

  resultClicked(result: SearchResult): void {
    if (result.category === 'user') {
      void this.navController.navigateForward([
        PATH.PROFILE,
        result.value.userId,
      ]);
      return;
    }

    if (
      result.category === 'bite' ||
      result.category === 'city' ||
      result.category === 'country'
    ) {
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
