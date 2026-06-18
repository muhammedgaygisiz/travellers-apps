import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAvatar,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
} from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import type { SearchBite, SearchRestaurant, SearchResult } from 'model';

@Component({
  selector: 'search-list',
  templateUrl: './search-list.component.html',
  styleUrl: './search-list.component.scss',
  imports: [
    IonAvatar,
    IonIcon,
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
