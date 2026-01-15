import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { getSimilarityScore, normalize } from 'utils';

@Component({
  selector: 'lib-restaurant-selector',
  templateUrl: './restaurant-selector.component.html',
  styleUrl: './restaurant-selector.component.scss',
  imports: [
    IonButton,
    IonButtons,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonSearchbar,
    IonTitle,
    IonToolbar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSelectorComponent {
  restaurants = input<string[]>([]);
  selectedRestaurant = input<string>('');

  restaurantSelected = output<string>();
  selectionCancel = output<void>();

  rawSearchTerm = signal('');

  filteredRestaurants = computed(() => {
    const searchTerm = this.rawSearchTerm();
    const restaurants = this.restaurants();

    if (!searchTerm) {
      return restaurants;
    }

    const normalizedSearchTerm = normalize(searchTerm);

    return restaurants
      .map((restaurant) => {
        const nameMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(restaurant),
        );

        const score = nameMatches.length > 0 ? nameMatches[0].score : 0;

        return {
          restaurant,
          score,
        };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ restaurant }) => restaurant);
  });

  // Show custom option if search term doesn't match any restaurant exactly
  showCustomOption = computed(() => {
    const searchTerm = this.rawSearchTerm();
    const filteredRestaurants = this.filteredRestaurants();

    if (!searchTerm) {
      return false;
    }

    const normalizedSearchTerm = normalize(searchTerm);

    // Check if there's an exact match (normalized)
    const hasExactMatch = filteredRestaurants.some(
      (restaurant) => normalize(restaurant) === normalizedSearchTerm,
    );

    return !hasExactMatch && searchTerm.length > 0;
  });

  searchbarInput(event: Event): void {
    const target = event.target as HTMLIonSearchbarElement;
    this.rawSearchTerm.set(target.value || '');
  }

  selectRestaurant(name: string): void {
    this.restaurantSelected.emit(name);
  }

  selectCustomRestaurant(): void {
    const searchTerm = this.rawSearchTerm();
    if (searchTerm) {
      this.restaurantSelected.emit(searchTerm);
    }
  }

  cancel(): void {
    this.selectionCancel.emit();
  }
}
