import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  type Signal,
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
import { BiteComponent } from 'bite-tribe-common/bite';
import type { Bite, SearchBite, SearchRestaurant, SearchResult } from 'model';

/** Matches the home feed and profile windows, so every list pages alike. */
const PAGE_SIZE = 50;

/**
 * Where the page's content column widens and the home feed turns into a card
 * grid. Kept in step with `$desktop-breakpoint` in the component stylesheet.
 * See GitHub issue #1791.
 */
const DESKTOP_MEDIA_QUERY = '(width >= 1024px)';

/** The categories whose results are Bites, and so can render as Bite cards. */
const BITE_CATEGORIES = new Set<SearchResult['category']>([
  'bite',
  'city',
  'country',
]);

interface BiteCard {
  result: SearchResult;
  bite: Bite;
}

@Component({
  selector: 'search-list',
  templateUrl: './search-list.component.html',
  styleUrl: './search-list.component.scss',
  imports: [
    BiteComponent,
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

  /**
   * Bite results render as the home feed's cards at desktop widths, where the
   * avatar list would be a narrow strip in a wide column. Phones keep the list,
   * and so do User and Restaurant results, which are not Bites. A search
   * returns one category, so the first result decides for the whole set.
   * See GitHub issue #1791.
   */
  showBiteCards = computed(() => {
    const [first] = this.results();
    return this.isDesktop() && !!first && BITE_CATEGORIES.has(first.category);
  });

  biteCards = computed<BiteCard[]>(() =>
    this.showBiteCards()
      ? this.displayedResults().map((result) => ({
          result,
          bite: toCardBite(result.value as SearchBite),
        }))
      : [],
  );

  hasMore = computed(
    () => this.sortedResults().length > this.currentPage() * PAGE_SIZE,
  );

  private readonly isDesktop = this.watchDesktopMedia();

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

  /**
   * A media query listener rather than CSS alone: rendering both the list and
   * the cards and hiding one would put two components, and every card's rating
   * modal, in the DOM for each result.
   */
  private watchDesktopMedia(): Signal<boolean> {
    const isDesktop = signal(false);

    if (typeof matchMedia !== 'function') {
      return isDesktop.asReadonly();
    }

    const query = matchMedia(DESKTOP_MEDIA_QUERY);
    const onChange = (event: MediaQueryListEvent): void =>
      isDesktop.set(event.matches);

    isDesktop.set(query.matches);
    query.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() =>
      query.removeEventListener('change', onChange),
    );

    return isDesktop.asReadonly();
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

/**
 * Fills the `Bite` fields the card requires but the search payload does not
 * carry. The card is shown read-only, so nothing reads the placeholders: it
 * draws no likes, no price and no distance.
 */
function toCardBite(bite: SearchBite): Bite {
  return {
    ...bite,
    image: bite.image ?? '',
    price: 0,
    position: bite.position ?? { latitude: 0, longitude: 0 },
  };
}
