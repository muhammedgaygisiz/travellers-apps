import { inject, Injectable, signal } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';
import { Bite, Geopoint, GooglePlace, PlaceDetails, Restaurant } from 'model';
import { NavController } from '@ionic/angular/standalone';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class NewRestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

  restaurantToCreate = this.dataAccess.restaurantToCreate;

  readonly googlePlaces = signal<GooglePlace[]>([]);
  readonly googlePlacesLoading = signal(false);
  readonly placeDetails = signal<PlaceDetails | undefined>(undefined);
  readonly placeDetailsLoading = signal(false);

  /** Candidate position used to bias the Google text search. */
  private prefillPosition?: Geopoint;

  async submitNewRestaurant(restaurant: Restaurant): Promise<void> {
    if (restaurant.restaurantCandidateId) {
      await this.dataAccess.verifyRestaurantCandidate(restaurant);
    } else {
      this.dataAccess.submitNewRestaurant(restaurant);
    }

    this.navController.navigateBack(['dashboard']);
  }

  biteClicked(bite: Bite): void {
    this.navController.navigateForward(['bite', bite.id]);
  }

  /**
   * Seeds the restaurant selector with a Google text search for the candidate
   * name, biased by the candidate position. Invoked when the operator opens the
   * "Prefill from Google Places" selector.
   */
  async searchPrefillPlaces(seed: {
    name: string;
    position?: Geopoint;
  }): Promise<void> {
    this.prefillPosition = seed.position;
    await this.runPlacesSearch(seed.name, seed.position);
  }

  /** Re-runs the Google text search when the operator types a new term. */
  async searchGooglePlaces(searchText: string): Promise<void> {
    await this.runPlacesSearch(searchText, this.prefillPosition);
  }

  private async runPlacesSearch(
    searchText: string,
    position?: Geopoint,
  ): Promise<void> {
    this.googlePlacesLoading.set(true);

    try {
      const places = await this.dataAccess.searchPlaces(searchText, position);
      this.googlePlaces.set(places);
    } catch {
      this.googlePlaces.set([]);
    } finally {
      this.googlePlacesLoading.set(false);
    }
  }

  /**
   * Loads the detailed Google Places record for the picked place. On success a
   * fresh `PlaceDetails` object is emitted so the page can apply it (a new
   * reference ensures re-picking the same place re-triggers the fill). On
   * failure the form is left unchanged and an error toast is shown.
   */
  async loadPlaceDetails(placeId: string): Promise<void> {
    this.placeDetailsLoading.set(true);

    try {
      const details = await this.dataAccess.getPlaceDetails(placeId);

      if (!details) {
        await this.showErrorToast();
        return;
      }

      this.placeDetails.set({ ...details });
    } catch {
      await this.showErrorToast();
    } finally {
      this.placeDetailsLoading.set(false);
    }
  }

  private showErrorToast(): Promise<void> {
    return this.toast.present({
      messageKey: 'prefill-error',
      outcome: 'failure',
    });
  }
}
