import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { NetworkStatusService } from 'common/networkstatus';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly networkStatusService = inject(NetworkStatusService);

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
  favCurrencies = toSignal(this.storeService.favCurrenciesFromSettings$);
  position = toSignal(this.storeService.position$);
  cachedBite = toSignal(this.storeService.cachedBite$);
  nearbyRestaurants = toSignal(this.storeService.nearbyRestaurants$);
  tagSuggestionsForEditingBite = toSignal(
    this.storeService.tagSuggestionsForEditingBite$,
  );

  networkStatus = this.networkStatusService.status;

  async submitNewBite(bite: any): Promise<void> {
    this.storeService.saveNewBite(bite);
  }

  async submitEditedBite(bite: any): Promise<void> {
    this.storeService.saveEditedBite(bite);
  }

  setEditingBite(bite: Partial<any>): void {
    this.storeService.setEditingBite(bite);
  }
}
