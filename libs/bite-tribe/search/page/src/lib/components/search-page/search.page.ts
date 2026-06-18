import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  IonAvatar,
  IonChip,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { SearchbarInputEventDetail } from '@ionic/core';
import type {
  SearchBite,
  SearchCategory,
  SearchRestaurant,
  SearchResult,
} from 'bite-tribe/search-data-access';

interface SearchCategoryOption {
  labelKey: string;
  value: SearchCategory;
}

@Component({
  selector: 'search-page',
  templateUrl: 'search.page.html',
  styleUrl: 'search.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonAvatar,
    IonChip,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonSpinner,
    TranslocoPipe,
  ],
})
export class SearchPage {
  categories: SearchCategoryOption[] = [
    { labelKey: 'search-category-user', value: 'user' },
    { labelKey: 'search-category-bite', value: 'bite' },
    { labelKey: 'search-category-restaurant', value: 'restaurant' },
  ];

  results = input<SearchResult[]>([]);
  selectedCategory = input<SearchCategory>('user');
  isLoading = input(false);
  hasSearched = input(false);

  searchTextChange = output<string>();
  categoryChange = output<SearchCategory>();
  resultClick = output<SearchResult>();

  imageErroredResultIds = signal<Set<string>>(new Set());
  sortedResults = computed(() =>
    [...this.results()].sort((a, b) =>
      this.getResultTitle(a).localeCompare(this.getResultTitle(b)),
    ),
  );

  searchbarInput(event: CustomEvent<SearchbarInputEventDetail>): void {
    this.searchTextChange.emit(event.detail.value ?? '');
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

    if (result.category === 'bite') {
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
