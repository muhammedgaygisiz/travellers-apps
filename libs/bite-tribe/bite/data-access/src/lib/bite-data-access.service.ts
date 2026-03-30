import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  biteLoader: ResourceLoader<any, any> = ({ params }) => {
    const biteId = params.biteId;
    if (biteId) {
      return FirebaseFirestore.getDocument({
        reference: `bites/${biteId}`,
      }).then((res) => {
        return {
          ...res.snapshot.data,
          id: res.snapshot.id,
        };
      });
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
  position = toSignal(this.storeService.position$);
  cachedBite = toSignal(this.storeService.cachedBite$);
  nearbyRestaurants = toSignal(this.storeService.nearbyRestaurants$);
  tagSuggestionsForEditingBite = toSignal(
    this.storeService.tagSuggestionsForEditingBite$,
  );

  async submitBite(bite: any): Promise<void> {
    this.storeService.save(bite, 'bite');
  }

  async submitNewBite(bite: any): Promise<void> {
    const { image, ...biteDocWithoutImage } = bite;

    this.storeService.saveNewBite(bite);

    let savedBite: any;
    try {
      savedBite = await this.api.saveNewBite(biteDocWithoutImage);
    } catch {
      return;
    }

    const biteWithImage = { ...savedBite, image };
    this.storeService.notifyBiteSaved(biteWithImage);

    if (image) {
      try {
        await this.api.updateImagePathInBite(biteWithImage, image);
      } catch {}
    }
  }

  async deleteBite(bite: any): Promise<void> {
    try {
      const deletedBite = await this.api.deleteBite(bite);
      this.storeService.notifyBiteDeleted(deletedBite);
    } catch {
      this.storeService.notifyErrorDeletingBite(bite);
    }
  }

  setEditingBite(bite: Partial<any>): void {
    this.storeService.setEditingBite(bite);
  }
}
