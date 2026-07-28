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
import { BiteTribeApiService, type LocalImageFile } from 'bite-tribe/api';
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
        this.handleUploadProgress(newBite),
      );
    }
  }

  /**
   * Finds the photo this device kept for a Bite, so a retry can tell the two
   * flows apart: re-send that copy, or ask the user to pick a photo because the
   * copy is gone (an older Bite, or one posted from another device).
   */
  findLocalImageForBite(biteId: string): Promise<LocalImageFile | undefined> {
    return this.api.findLocalBiteImage(biteId);
  }

  /**
   * Re-uploads a Bite's photo from a file on this device.
   *
   * The document goes back to `pending` first, so every viewer sees the retry
   * rather than a card that silently changes its mind later. See GitHub issue
   * #1168.
   */
  async retryImageUpload(bite: Bite, fileUri: string): Promise<void> {
    await this.api.setBiteImageStatus(bite.id, 'pending');
    this.storeService.savedNewBite({ ...bite, imageStatus: 'pending' });

    this.analytics.logEvent(AnalyticsEvent.BiteImageUploadRetried);

    await this.api.uploadBiteImageFromLocalFile(
      bite.id,
      fileUri,
      this.handleUploadProgress({ ...bite, imageStatus: 'pending' }),
    );
  }

  /**
   * Shared by the first upload and every retry: reports progress, and records a
   * terminal `failed` on the document because only the storage finalize trigger
   * clears `pending` and it never runs for an upload that errored.
   */
  private handleUploadProgress(
    bite: Bite,
  ): (p: CreateAndUploadImageCallbackParams) => void {
    return (p: CreateAndUploadImageCallbackParams): void => {
      const uploadError = p.uploadParams?.err;
      const isInProgress = p.uploadParams?.evt?.completed === false;
      const finishedUpload = p.uploadParams?.evt?.completed === true;

      if (uploadError) {
        this.analytics.logEvent(AnalyticsEvent.BiteImageUploadFailed, {
          code: toUploadErrorCode(uploadError),
        });
        void this.api.setBiteImageStatus(bite.id, 'failed');
        this.storeService.savedNewBite({ ...bite, imageStatus: 'failed' });
        this.uploadProgress.set(null);
      } else if (isInProgress && p.uploadParams) {
        this.uploadProgress.set({
          biteId: bite.id,
          progress: p.uploadParams,
        });
      } else if (finishedUpload) {
        this.analytics.logEvent(AnalyticsEvent.BiteImageUploaded);
        this.uploadProgress.set(null);
      }
    };
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
