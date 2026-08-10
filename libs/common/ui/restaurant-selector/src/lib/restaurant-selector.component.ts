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
import { NgTemplateOutlet } from '@angular/common';
import { getSimilarityScore, haversineDistance, normalize } from 'utils';
import { TranslocoPipe } from '@jsverse/transloco';

/**
 * Latitude/longitude pair, kept local so this common UI component stays
 * independent of app models.
 */
export interface SelectorPosition {
  latitude: number;
  longitude: number;
}

/**
 * View model for a place returned from an external maps provider.
 * Kept local so this common UI component stays independent of app models.
 */
export interface GooglePlaceOption {
  placeId: string;
  name: string;
  address: string;
  position: SelectorPosition;
  distance?: string;
}

/**
 * View model for a local restaurant row. Kept local so this common UI component
 * stays independent of app models; callers pass their own structurally-compatible
 * type. `distance` is a raw km value as a string; `undefined` sorts last.
 */
export interface RestaurantOption {
  name: string;
  distance?: string;
  position?: SelectorPosition;
  restaurantId?: string;
}

/** The part of a row this component needs to measure and order it. */
export interface DistanceCandidate {
  distance?: string;
  position?: SelectorPosition;
}

/** One distance line under a row, in reading order. */
export interface DistanceLine {
  /**
   * Transloco key naming the origin the distance was measured from, or empty
   * for the single unlabelled line shown while there is only one origin.
   */
  labelKey: string;
  distance: string;
}

/**
 * How far the Bite's position has to sit from the device before both distances
 * are worth showing.
 *
 * Below this the two numbers answer the same question — the Bite was placed
 * where the user is standing — and a second labelled line would only repeat the
 * first. Half a kilometre is above GPS and EXIF noise while staying under the
 * spread of a plausible candidate list, so a genuine `Posting later` case is
 * never mistaken for posting on the spot. See GitHub issue #1269.
 */
export const DIVERGED_POSITION_THRESHOLD_KM = 0.5;

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
    NgTemplateOutlet,
    TranslocoPipe,
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

  /** Where the device currently is, used for the `how far is this from me` distance. */
  userPosition = input<SelectorPosition | undefined>(undefined);

  /**
   * The position the Bite carries, used for the `how close is this to where the
   * Bite happened` distance. Left unset by callers that have no Bite in hand,
   * which keeps the single-distance rows of the business app unchanged.
   */
  bitePosition = input<SelectorPosition | undefined>(undefined);

  restaurantSelected = output<string>();
  selectionCancel = output<void>();
  searchInGoogleMaps = output<string>();
  googlePlaceSelected = output<GooglePlaceOption>();

  rawSearchTerm = signal('');
  googleSearchTerm = signal('');

  /**
   * True once the Bite sits far enough from the device that a distance measured
   * from the device can no longer tell the candidates apart. That is the
   * `Posting later` case from GitHub issue #1269, where a Bite created in Bern
   * from a photo taken in Ronda put every Ronda candidate ~1539 km away.
   */
  hasDivergedPositions = computed(() => {
    const between = this.distanceBetween(
      this.userPosition(),
      this.bitePosition(),
    );

    return between !== undefined && between >= DIVERGED_POSITION_THRESHOLD_KM;
  });

  filteredRestaurants = computed(() => {
    const searchTerm = this.rawSearchTerm();
    const restaurants = this.restaurants();

    if (!searchTerm) {
      // Default view: nearest first.
      return this.sortByDistance(restaurants);
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

  sortedGooglePlaces = computed(() => this.sortByDistance(this.googlePlaces()));

  sortedNearbyGooglePlaces = computed(() =>
    this.sortByDistance(this.nearbyGooglePlaces()),
  );

  private sortByDistance<T extends DistanceCandidate>(items: T[]): T[] {
    return [...items].sort(
      (a, b) => this.sortDistance(a) - this.sortDistance(b),
    );
  }

  /**
   * Distance the list is ordered by: from the Bite once the two positions
   * diverge, because the user is picking which place the Bite belongs to and
   * every candidate is equally far from the device, and from the device
   * otherwise. Options with no position of their own keep the distance their
   * caller precomputed.
   */
  private sortDistance(option: DistanceCandidate): number {
    if (this.hasDivergedPositions()) {
      const fromBite = this.distanceBetween(
        this.bitePosition(),
        option.position,
      );

      if (fromBite !== undefined) {
        return fromBite;
      }
    }

    return this.toDistance(option.distance);
  }

  /**
   * The distance lines one row shows: both origins, each named, while the Bite
   * and the device are in different places, and the single unlabelled distance
   * everywhere else so posting on the spot keeps today's compact row.
   */
  distanceLines(option: DistanceCandidate): DistanceLine[] {
    if (!this.hasDivergedPositions()) {
      const distance = this.formatDistance(option.distance);

      return distance ? [{ labelKey: '', distance }] : [];
    }

    // The discriminating distance goes first: it is the one that separates
    // candidates that are otherwise all ~1539 km away.
    const lines: [string, string][] = [
      [
        'restaurant-selector-distance-from-bite',
        this.formatKm(
          this.distanceBetween(this.bitePosition(), option.position),
        ),
      ],
      [
        'restaurant-selector-distance-from-you',
        this.formatKm(
          this.distanceBetween(this.userPosition(), option.position),
        ),
      ],
    ];

    return lines
      .filter(([, distance]) => !!distance)
      .map(([labelKey, distance]) => ({ labelKey, distance }));
  }

  private distanceBetween(
    from?: SelectorPosition,
    to?: SelectorPosition,
  ): number | undefined {
    if (!from || !to) {
      return undefined;
    }

    const km = haversineDistance(
      from.latitude,
      from.longitude,
      to.latitude,
      to.longitude,
      'km',
    );

    return km === undefined ? undefined : parseFloat(km);
  }

  private toDistance(distance?: string): number {
    const parsed = distance ? parseFloat(distance) : NaN;
    return Number.isNaN(parsed) ? Infinity : parsed;
  }

  private formatKm(km?: number): string {
    return km !== undefined && Number.isFinite(km) ? `${km.toFixed(1)} km` : '';
  }

  formatDistance(distance?: string): string {
    return this.formatKm(this.toDistance(distance));
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
