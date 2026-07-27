import {
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { NetworkStatusService } from 'common/networkstatus';
import type {
  Bite,
  CreateAndUploadImageCallbackParams,
  GooglePlace,
  Geopoint,
  UploadParams,
} from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { withGooglePlaceDistance } from './utils/with-google-place-distance';
import { toUploadErrorCode } from './utils/to-upload-error-code';

const MIN_GOOGLE_PLACE_SEARCH_TEXT_LENGTH = 3;

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly networkStatusService = inject(NetworkStatusService);

  private readonly api = inject(BiteTribeApiService);
  private readonly analytics = inject(AnalyticsService);

  biteLoader: ResourceLoader<Bite | undefined, { biteId: string | undefined }> =
    async ({ params }) => {
      const biteId = params.biteId;
      if (biteId) {
        const res = await FirebaseFirestore.getDocument({
          reference: `bites/${biteId}`,
        });
        return {
          ...res.snapshot.data,
          id: res.snapshot.id,
        } as Bite;
      }

      return undefined;
    };

  bite = resource({
    params: () => ({
      biteId: this.storeService.biteIdFromUrl(),
    }),
    loader: this.biteLoader.bind(this),
  });

  currency = toSignal(this.storeService.currencyFromSettings$);
  favCurrencies = toSignal(this.storeService.favCurrenciesFromSettings$);
  position = toSignal(this.storeService.position$);
  cachedBite = toSignal(this.storeService.cachedBite$);
  nearbyRestaurants = toSignal(this.storeService.nearbyRestaurants$);
  tagSuggestionsForEditingBite = toSignal(
    this.storeService.tagSuggestionsForEditingBite$,
  );

  networkStatus = this.networkStatusService.status;

  readonly googlePlaceSearchText = signal('');

  private readonly googlePlacesResource = resource<GooglePlace[], string>({
    params: () => this.googlePlaceSearchText(),
    loader: async ({ params }) => {
      const searchText = params.trim();

      if (searchText.length < MIN_GOOGLE_PLACE_SEARCH_TEXT_LENGTH) {
        return [];
      }

      const position = this.position();
      const places = await this.api.searchPlaces(searchText, position);

      return withGooglePlaceDistance(places, position);
    },
    defaultValue: [],
  });

  googlePlaces = this.googlePlacesResource.value;
  googlePlacesLoading = this.googlePlacesResource.isLoading;

  /**
   * Position to load nearby Google places for. Left `undefined` until a caller
   * explicitly requests nearby suggestions (e.g. the restaurant selector opens
   * without any local restaurants), so the Google callable is only hit on demand.
   */
  readonly nearbyGooglePlacesPosition = signal<Geopoint | undefined>(undefined);

  private readonly nearbyGooglePlacesResource = resource<
    GooglePlace[],
    Geopoint | undefined
  >({
    params: () => this.nearbyGooglePlacesPosition(),
    loader: async ({ params }) => {
      if (!params) {
        return [];
      }

      const places = await this.api.searchNearbyPlaces(params);

      return withGooglePlaceDistance(places, params);
    },
    defaultValue: [],
  });

  nearbyGooglePlaces = this.nearbyGooglePlacesResource.value;
  nearbyGooglePlacesLoading = this.nearbyGooglePlacesResource.isLoading;

  readonly uploadProgress = signal<{
    biteId: string;
    progress: UploadParams;
  } | null>(null);

  async submitNewBite(bite: Bite): Promise<void> {
    this.storeService.saveNewBite();

    const { image, ...biteDocWithoutImage } = bite;
    // Mark the image as pending upload so viewers (and the poster) can see an
    // in-progress state instead of an empty card. The backend Cloud Function
    // setBiteImagePathOnUpload flips this to 'uploaded' once the upload finalizes.
    const biteDocToSave = image
      ? { ...biteDocWithoutImage, imageStatus: 'pending' as const }
      : biteDocWithoutImage;
    const savedBite = await this.api.saveNewBite(biteDocToSave);
    const newBite = { ...savedBite, image };
    this.storeService.savedNewBite(newBite);

    if (image) {
      // Fire-and-forget: the Cloud Function setBiteImagePathOnUpload
      // will update the Firestore document with the download URL once complete.
      void this.api.uploadImage(
        { ...bite, id: newBite.id },
        (p: CreateAndUploadImageCallbackParams): void => {
          const uploadError = p.uploadParams?.err;
          const isInProgress = p.uploadParams?.evt?.completed === false;
          const finishedUpload = p.uploadParams?.evt?.completed === true;

          if (uploadError) {
            this.analytics.logEvent(AnalyticsEvent.BiteImageUploadFailed, {
              code: toUploadErrorCode(uploadError),
            });
            // Leave the document on a terminal state. Only the finalize trigger
            // clears 'pending', so without this the card shows "uploading" to
            // every viewer forever.
            void this.api.setBiteImageStatus(newBite.id, 'failed');
            this.storeService.savedNewBite({
              ...newBite,
              imageStatus: 'failed',
            });
            this.uploadProgress.set(null);
          } else if (isInProgress && p.uploadParams) {
            this.uploadProgress.set({
              biteId: newBite.id,
              progress: p.uploadParams,
            });
          } else if (finishedUpload) {
            this.analytics.logEvent(AnalyticsEvent.BiteImageUploaded);
            this.uploadProgress.set(null);
          }
        },
      );
    }
  }

  async submitEditedBite(bite: Bite): Promise<void> {
    this.storeService.saveEditedBite(bite);
  }

  setEditingBite(bite: Partial<Bite>): void {
    this.storeService.setEditingBite(bite);
  }

  searchGooglePlaces(searchText: string): void {
    this.googlePlaceSearchText.set(searchText);
  }

  loadNearbyGooglePlaces(position: Geopoint): void {
    this.nearbyGooglePlacesPosition.set(position);
  }

  getCurrencyByPosition(position?: Geopoint): Promise<string | undefined> {
    return this.api.getCurrencyByPosition(position);
  }
}
