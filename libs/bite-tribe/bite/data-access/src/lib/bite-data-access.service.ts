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
  UploadParams,
} from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';

const MIN_GOOGLE_PLACE_SEARCH_TEXT_LENGTH = 3;

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly networkStatusService = inject(NetworkStatusService);

  private readonly api = inject(BiteTribeApiService);

  biteLoader: ResourceLoader<any, any> = async ({ params }) => {
    const biteId = params.biteId;
    if (biteId) {
      const res = await FirebaseFirestore.getDocument({
        reference: `bites/${biteId}`,
      });
      return {
        ...res.snapshot.data,
        id: res.snapshot.id,
      };
    }

    return Promise.resolve();
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

      return this.api.searchPlaces(searchText, this.position());
    },
    defaultValue: [],
  });

  googlePlaces = this.googlePlacesResource.value;
  googlePlacesLoading = this.googlePlacesResource.isLoading;

  readonly uploadProgress = signal<{
    biteId: string;
    progress: UploadParams;
  } | null>(null);

  async submitNewBite(bite: Bite): Promise<void> {
    this.storeService.saveNewBite();

    const { image, ...biteDocWithoutImage } = bite;
    const savedBite = await this.api.saveNewBite(biteDocWithoutImage);
    const newBite = { ...savedBite, image };
    this.storeService.savedNewBite(newBite);

    if (image) {
      // Fire-and-forget: the Cloud Function setBiteImagePathOnUpload
      // will update the Firestore document with the download URL once complete.
      void this.api.uploadImage(
        { ...bite, id: newBite.id },
        (p: CreateAndUploadImageCallbackParams): void => {
          const isInProgress = p.uploadParams?.evt?.completed === false;
          const finishedUpload = p.uploadParams?.evt?.completed === true;

          if (isInProgress && p.uploadParams) {
            this.uploadProgress.set({
              biteId: newBite.id,
              progress: p.uploadParams,
            });
          } else if (finishedUpload) {
            this.uploadProgress.set(null);
          }
        },
      );
    }
  }

  async submitEditedBite(bite: any): Promise<void> {
    this.storeService.saveEditedBite(bite);
  }

  setEditingBite(bite: Partial<any>): void {
    this.storeService.setEditingBite(bite);
  }

  searchGooglePlaces(searchText: string): void {
    this.googlePlaceSearchText.set(searchText);
  }
}
