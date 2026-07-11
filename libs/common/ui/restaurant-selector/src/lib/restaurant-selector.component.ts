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
  IonListHeader,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { getSimilarityScore, normalize } from 'utils';

/**
 * View model for a place returned from an external maps provider.
 * Kept local so this common UI component stays independent of app models.
 */
export interface GooglePlaceOption {
  placeId: string;
  name: string;
  address: string;
  position: { latitude: number; longitude: number };
}

/**
 * View model for a local restaurant row. Kept local so this common UI component
 * stays independent of app models; callers pass their own structurally-compatible
 * type. `distance` is a raw km value as a string; `undefined` sorts last.
 */
export interface RestaurantOption {
  name: string;
  distance?: string;
  position?: { latitude: number; longitude: number };
  restaurantId?: string;
}

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
    IonListHeader,
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToolbar,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RestaurantSelectorComponent {
  restaurants = input<RestaurantOption[]>([]);
  selectedRestaurant = input<string>('');
  googlePlaces = input<GooglePlaceOption[]>([]);
  googlePlacesLoading = input<boolean>(false);
  nearbyGooglePlaces = input<GooglePlaceOption[]>([]);
  nearbyGooglePlacesLoading = input<boolean>(false);

  restaurantSelected = output<string>();
  selectionCancel = output<void>();
  searchInGoogleMaps = output<string>();
  googlePlaceSelected = output<GooglePlaceOption>();

  rawSearchTerm = signal('');
  googleSearchTerm = signal('');

  filteredRestaurants = computed(() => {
    const searchTerm = this.rawSearchTerm();
    const restaurants = this.restaurants();

    if (!searchTerm) {
      // Default view: nearest first.
      return [...restaurants].sort(
        (a, b) => this.toDistance(a.distance) - this.toDistance(b.distance),
      );
    }

    const normalizedSearchTerm = normalize(searchTerm);

    return restaurants
      .map((restaurant) => {
        const nameMatches = getSimilarityScore(
          normalizedSearchTerm,
          normalize(restaurant.name),
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
      (restaurant) => normalize(restaurant.name) === normalizedSearchTerm,
    );

    return !hasExactMatch && searchTerm.length > 0;
  });

  hasLocalHits = computed(() => this.filteredRestaurants().length > 0);

  // Offer the Google Maps search once there are no local hits for the
  // current term and it has not been searched on Google yet.
  showGoogleSearchOption = computed(
    () =>
      this.rawSearchTerm().length > 0 &&
      !this.hasLocalHits() &&
      this.googleSearchTerm() !== this.rawSearchTerm(),
  );

  // Show the Google results (or spinner) only for the term the user searched.
  showGoogleResults = computed(
    () =>
      this.googleSearchTerm().length > 0 &&
      this.googleSearchTerm() === this.rawSearchTerm(),
  );

  // Show nearby Google suggestions in the default view (before typing) when
  // they are loading or available. The host only provides these when there are
  // no local restaurants, so this stays a fallback for empty local results.
  showNearbyGooglePlaces = computed(
    () =>
      this.rawSearchTerm().length === 0 &&
      (this.nearbyGooglePlacesLoading() ||
        this.nearbyGooglePlaces().length > 0),
  );

  private toDistance(distance?: string): number {
    const parsed = distance ? parseFloat(distance) : NaN;
    return Number.isNaN(parsed) ? Infinity : parsed;
  }

  formatDistance(distance?: string): string {
    const km = this.toDistance(distance);
    return Number.isFinite(km) ? `${km.toFixed(1)} km` : '';
  }

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

  searchGoogleMaps(): void {
    const searchTerm = this.rawSearchTerm();
    if (searchTerm) {
      this.googleSearchTerm.set(searchTerm);
      this.searchInGoogleMaps.emit(searchTerm);
    }
  }

  selectGooglePlace(place: GooglePlaceOption): void {
    this.googlePlaceSelected.emit(place);
  }

  cancel(): void {
    this.selectionCancel.emit();
  }
}
