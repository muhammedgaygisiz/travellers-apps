import { inject, Injectable, signal } from '@angular/core';
import { RestaurantsDataAccessService } from 'bite-tribe-admin/restaurants-data-access';
import { photoRefusalReasonKey } from 'bite-tribe-common/bite';
import type { FolderPhotoVerdict } from 'model';
import { Bite, Geopoint, GooglePlace, PlaceDetails, Restaurant } from 'model';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class NewRestaurantService {
  private readonly dataAccess = inject(RestaurantsDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);

  /** One save at a time: a second submit started a second verification. */
  private saving = false;

  restaurantToCreate = this.dataAccess.restaurantToCreate;

  readonly googlePlaces = signal<GooglePlace[]>([]);
  readonly googlePlacesLoading = signal(false);
  readonly placeDetails = signal<PlaceDetails | undefined>(undefined);
  readonly placeDetailsLoading = signal(false);

  /** Candidate position used to bias the Google text search. */
  private prefillPosition?: Geopoint;

  /**
   * Leaves the page only once the restaurant is written. A failed save stays
   * on the page with the operator's input and says so: it used to navigate
   * back as if it had worked while nothing was written (issue #1952).
   */
  async submitNewRestaurant(restaurant: Restaurant): Promise<void> {
    if (this.saving) {
      return;
    }
    this.saving = true;

    // Modal, as on the business menu editor: a photo upload can take a while,
    // and the page used to look idle while it ran, which invited a second
    // submit and a second verification (issue #2172).
    const loading = await this.loadingController.create({
      message: this.transloco.translate('restaurant-saving'),
      backdropDismiss: false,
    });
    await loading.present();

    let photoVerdict: FolderPhotoVerdict | undefined;

    try {
      if (restaurant.restaurantCandidateId) {
        await this.dataAccess.verifyRestaurantCandidate(restaurant);
      } else {
        photoVerdict = await this.dataAccess.submitNewRestaurant(restaurant);
      }
    } catch (error) {
      console.error('Could not create the restaurant:', error);
      await loading.dismiss();
      this.saving = false;
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });

      return;
    }

    await loading.dismiss();
    this.saving = false;

    if (!restaurant.restaurantCandidateId && restaurant.image) {
      await this.reportPhotoVerdict(photoVerdict);
    }

    this.navController.navigateBack(['dashboard']);
  }

  /**
   * Says what became of the photo, which only the image check publishes
   * (GitHub issue #2141). A passed photo needs no word: it is on the
   * restaurant, as it always was.
   */
  private async reportPhotoVerdict(
    verdict: FolderPhotoVerdict | undefined,
  ): Promise<void> {
    if (verdict?.imageStatus === 'uploaded') {
      return;
    }

    if (verdict?.imageStatus === 'refused') {
      await this.toast.present({
        message: `${this.transloco.translate('restaurant-saved-photo-refused')} ${this.transloco.translate(photoRefusalReasonKey(verdict.imageRefusalCategory))}`,
        outcome: 'failure',
      });

      return;
    }

    await this.toast.present({
      messageKey: 'restaurant-saved-photo-checking',
      outcome: 'success',
    });
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
