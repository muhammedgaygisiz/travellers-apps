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
import { resourceFailed, resourceValue } from 'utils';
import { withGooglePlaceDistance } from './utils/with-google-place-distance';
import { toUploadErrorCode } from './utils/to-upload-error-code';

const MIN_GOOGLE_PLACE_SEARCH_TEXT_LENGTH = 3;

/**
 * How long an upload may report nothing at all before this device stops
 * claiming the photo is still on its way.
 *
 * A transfer that loses connectivity mid-flight neither completes nor errors:
 * the Storage SDK keeps retrying silently for its own (ten minute) window, so
 * the error branch below never runs and the Bite sits on `pending` with no
 * failure to act on. That is the offline case from GitHub issue #1229. Every
 * progress event restarts this clock, so a slow-but-moving upload is never cut
 * short and only a transfer that has genuinely stopped is declared failed.
 */
export const STALLED_UPLOAD_TIMEOUT_MS = 30 * 1000;

/**
 * Analytics code for an upload that stopped reporting instead of failing, so
 * stalls stay distinguishable from the Storage error codes `toUploadErrorCode`
 * produces.
 */
const STALLED_UPLOAD_ERROR_CODE = 'stalled';

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

  /**
   * The Bite being edited, or nothing. Never read off the resource directly:
   * `value()` throws once the read has failed, which would take the whole page
   * binding down with it. See GitHub issue #1232.
   */
  biteValue = resourceValue(this.bite);

  /** True once the Bite read failed, so the page can say so. */
  biteLoadFailed = resourceFailed(this.bite);

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

  // A Places lookup rejects on a network drop or an App Check refusal, and the
  // page binds this straight through, so it is read guarded and falls back to
  // no suggestions rather than throwing. See GitHub issue #1232.
  googlePlaces = resourceValue(this.googlePlacesResource, [] as GooglePlace[]);
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

  nearbyGooglePlaces = resourceValue(
    this.nearbyGooglePlacesResource,
    [] as GooglePlace[],
  );
  nearbyGooglePlacesLoading = this.nearbyGooglePlacesResource.isLoading;

  readonly uploadProgress = signal<{
    biteId: string;
    progress: UploadParams;
  } | null>(null);

  /** Stall watchdogs for the uploads this device currently has in flight. */
  private readonly stalledUploadTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  /**
   * The Bites this device is currently uploading a photo for, so a second
   * attempt cannot start alongside the first and put two objects in Storage for
   * the same Bite.
   */
  private readonly uploadsInFlight = new Set<string>();

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
    this.storeService.createdNewBite(newBite);

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
    // Claimed synchronously: the first `await` below is enough of a gap for a
    // double tap to start a second transfer for the same Bite.
    if (this.uploadsInFlight.has(bite.id)) {
      return;
    }
    this.uploadsInFlight.add(bite.id);

    await this.api.setBiteImageStatus(bite.id, 'pending');
    this.storeService.savedNewBite({ ...bite, imageStatus: 'pending' });

    this.analytics.logEvent(AnalyticsEvent.BiteImageUploadRetried);

    const pendingBite = { ...bite, imageStatus: 'pending' as const };

    try {
      await this.api.uploadBiteImageFromLocalFile(
        bite.id,
        fileUri,
        this.handleUploadProgress(pendingBite),
      );
    } catch (error) {
      // A file that cannot be read (deleted, or a picked image the app can no
      // longer open) never reaches the upload callback, so the failure has to be
      // recorded here or the Bite would stay pending until the watchdog fires.
      this.failImageUpload(pendingBite, toUploadErrorCode(error));
    }
  }

  /**
   * Shared by the first upload and every retry: reports progress, and records a
   * terminal `failed` on the document because only the storage finalize trigger
   * clears `pending` and it never runs for an upload that errored.
   *
   * Creating the handler also starts the stall watchdog, so no caller can start
   * a transfer that has no way out of `pending`.
   */
  private handleUploadProgress(
    bite: Bite,
  ): (p: CreateAndUploadImageCallbackParams) => void {
    this.uploadsInFlight.add(bite.id);
    this.restartStalledUploadTimer(bite);

    return (p: CreateAndUploadImageCallbackParams): void => {
      const uploadError = p.uploadParams?.err;
      const isInProgress = p.uploadParams?.evt?.completed === false;
      const finishedUpload = p.uploadParams?.evt?.completed === true;

      if (uploadError) {
        this.failImageUpload(bite, toUploadErrorCode(uploadError));
      } else if (isInProgress && p.uploadParams) {
        this.restartStalledUploadTimer(bite);
        this.uploadProgress.set({
          biteId: bite.id,
          progress: p.uploadParams,
        });
      } else if (finishedUpload) {
        this.endUpload(bite.id);
        this.analytics.logEvent(AnalyticsEvent.BiteImageUploaded);
        this.uploadProgress.set(null);
      }
    };
  }

  /**
   * Gives the transfer a fresh {@link STALLED_UPLOAD_TIMEOUT_MS} to report
   * something before it counts as abandoned.
   */
  private restartStalledUploadTimer(bite: Bite): void {
    this.clearStalledUploadTimer(bite.id);

    this.stalledUploadTimers.set(
      bite.id,
      setTimeout(
        () => this.failImageUpload(bite, STALLED_UPLOAD_ERROR_CODE),
        STALLED_UPLOAD_TIMEOUT_MS,
      ),
    );
  }

  private clearStalledUploadTimer(biteId: string): void {
    const timer = this.stalledUploadTimers.get(biteId);

    if (timer) {
      clearTimeout(timer);
      this.stalledUploadTimers.delete(biteId);
    }
  }

  private endUpload(biteId: string): void {
    this.clearStalledUploadTimer(biteId);
    this.uploadsInFlight.delete(biteId);
  }

  /**
   * Records the terminal `failed` state everywhere it is read: on the document
   * for other devices and later sessions, and in the store so the card in front
   * of the user stops saying "uploading" right away.
   *
   * Offline the document write is queued by Firestore and applies to the local
   * cache immediately, which is what makes the failed state visible while the
   * device that posted the Bite is still disconnected.
   *
   * Only an upload this device is still tracking can fail, so an attempt that
   * has already reached a terminal state cannot be written off a second time by
   * a late error.
   */
  private failImageUpload(bite: Bite, code: string): void {
    if (!this.uploadsInFlight.has(bite.id)) {
      return;
    }

    this.endUpload(bite.id);

    this.analytics.logEvent(AnalyticsEvent.BiteImageUploadFailed, { code });
    void this.api.setBiteImageStatus(bite.id, 'failed');
    this.storeService.savedNewBite({ ...bite, imageStatus: 'failed' });
    this.uploadProgress.set(null);
  }

  async submitEditedBite(bite: Bite): Promise<void> {
    this.storeService.saveEditedBite(bite);
  }

  setEditingBite(bite: Partial<Bite>): void {
    this.storeService.setEditingBite(bite);
  }

  clearCachedBite(): void {
    this.storeService.clearCachedBite();
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
