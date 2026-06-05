import { inject, Injectable, resource, ResourceLoader } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { NetworkStatusService } from 'common/networkstatus';
import { Bite, CreateAndUploadImageCallbackParams } from 'model';
import { BiteTribeApiService } from 'bite-tribe/api';
import { ToastController } from '@ionic/angular';
import { TranslocoService } from '@jsverse/transloco';

@Injectable({ providedIn: 'root' })
export class BiteDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly networkStatusService = inject(NetworkStatusService);

  private readonly api = inject(BiteTribeApiService);
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

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

  async submitNewBite(bite: Bite): Promise<void> {
    this.storeService.saveNewBite();

    const { image, ...biteDocWithoutImage } = bite;

    const savedBite = await this.api.saveNewBite(biteDocWithoutImage);

    const newBite = {
      ...savedBite,
      image,
    };

    this.storeService.savedNewBite(newBite);

    void this.api.uploadImage(
      { ...bite, id: newBite.id },
      (p: CreateAndUploadImageCallbackParams): void => {
        if (p.uploadParams?.evt?.completed === false) {
          this.storeService.uploadingImage(
            p.uploadParams,
            newBite.id,
            p.imagePath,
          );
        } else if (p.uploadParams?.evt?.completed === true) {
          this.storeService.uploadedImage(
            { ...bite, id: newBite.id },
            p.imagePath,
          );
        }
      },
    );

    void this.showToast('bite-created-successfully');
  }

  async submitEditedBite(bite: any): Promise<void> {
    this.storeService.saveEditedBite(bite);
  }

  setEditingBite(bite: Partial<any>): void {
    this.storeService.setEditingBite(bite);
  }

  private currentToast: HTMLIonToastElement | null = null;

  private async showToast(key: string): Promise<void> {
    if (this.currentToast) {
      await this.currentToast.onDidDismiss();
    }
    this.currentToast = await this.toastController.create({
      message: this.transloco.translate(key),
      duration: 3000,
      position: 'bottom',
      color: 'success',
    });
    await this.currentToast.present();
    void this.currentToast.onDidDismiss().then(() => {
      this.currentToast = null;
    });
  }
}
