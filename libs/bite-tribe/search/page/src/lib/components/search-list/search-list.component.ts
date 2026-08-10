import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import {
  IonAvatar,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import { InfiniteScrollCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SearchBite, SearchRestaurant, SearchResult } from 'model';

/** Matches the home feed and profile windows, so every list pages alike. */
const PAGE_SIZE = 50;

@Component({
  selector: 'search-list',
  templateUrl: './search-list.component.html',
  styleUrl: './search-list.component.scss',
  imports: [
    IonAvatar,
    IonIcon,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchListComponent {
  results = input<SearchResult[]>([]);
  isLoading = input(false);
  hasSearched = input(false);

  resultClick = output<SearchResult>();

  imageErroredResultIds = signal<Set<string>>(new Set());
  sortedResults = computed(() =>
    [...this.results()].sort((a, b) =>
      this.getResultTitle(a).localeCompare(this.getResultTitle(b)),
    ),
  );

  /**
   * A country search returns every Bite of that country in one payload, so the
   * whole set would otherwise render — and request every result image — at
   * once. The list is windowed the same way the home feed and profile are, and
   * a fresh result set starts back at the first page.
   */
  currentPage = linkedSignal<SearchResult[], number>({
    source: this.results,
    computation: () => 1,
  });

  displayedResults = computed(() =>
    this.sortedResults().slice(0, this.currentPage() * PAGE_SIZE),
  );

  hasMore = computed(
    () => this.sortedResults().length > this.currentPage() * PAGE_SIZE,
  );

  onIonInfinite(event: InfiniteScrollCustomEvent): void {
    if (this.hasMore()) {
      this.currentPage.update((page) => page + 1);
    }

    void event.target.complete();
  }

  onResultImageError(resultId: string): void {
    this.imageErroredResultIds.update((ids) => new Set([...ids, resultId]));
  }

  getResultId(result: SearchResult): string {
    if (result.category === 'user') {
      return `${result.category}-${result.value.userId}`;
    }

    return `${result.category}-${result.value.id}`;
  }

  getResultTitle(result: SearchResult): string {
    if (result.category === 'user') {
      return result.value.displayName ?? '';
    }

    return result.value.name;
  }

  getResultSubtitle(result: SearchResult): string | undefined {
    if (result.category === 'user') {
      return result.value.fullName;
    }

    if (
      result.category === 'bite' ||
      result.category === 'city' ||
      result.category === 'country'
    ) {
      return this.getBiteSubtitle(result.value);
    }

    return this.getRestaurantSubtitle(result.value);
  }

  getResultImage(result: SearchResult): string | undefined {
    if (result.category === 'user') {
      return result.value.photoUrl;
    }

    return result.value.imagePath || result.value.image;
  }

  getResultFallbackIcon(result: SearchResult): string {
    if (result.category === 'user') {
      return 'person-circle-outline';
    }

    if (result.category === 'city' || result.category === 'country') {
      return 'location-outline';
    }

    if (result.category === 'bite') {
      return 'restaurant-outline';
    }

    return 'storefront-outline';
  }

  isUnverifiedRestaurant(result: SearchResult): boolean {
    return result.category === 'restaurant' && !result.value.restaurantId;
  }

  private getBiteSubtitle(bite: SearchBite): string | undefined {
    if (bite.place && bite.description) {
      return `${bite.place} - ${bite.description}`;
    }

    return bite.place || bite.description;
  }

  private getRestaurantSubtitle(
    restaurant: SearchRestaurant,
  ): string | undefined {
    return restaurant.place;
  }
}
