import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
} from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { NavController } from '@ionic/angular';
import { AlertController, LoadingController } from '@ionic/angular/standalone';

@Component({
  selector: 'bite-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bite
    class="ion-page"
    [bite]="service.cachedBite()"
    [currency]="service.currency()"
    [position]="service.position()"
    [image]="service.image() || ''"
    [isNew]="true"
    [nearbyRestaurants]="service.nearbyRestaurants() || []"
    [suggestedTags]="service.tagSuggestionsForEditingBite() || []"
    (submitBite)="submitNewBite($event)"
    (placeChange)="onPlaceChange($event)"
  />`,
  imports: [BitePage],
})
export class BiteContainer {
  service = inject(BiteService);

  readonly navController = inject(NavController);
  readonly alertController = inject(AlertController);
  private readonly loadingController = inject(LoadingController);
  loading: HTMLIonLoadingElement | null = null;

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'New Bite',
    });
  }

  onPlaceChange(place: string): void {
    const currentBite = this.service.cachedBite() || {};
    const editingBiteWithCurrentPlace = { ...currentBite, place };
    this.service.setEditingBite(editingBiteWithCurrentPlace);
  }

  async submitNewBite(newBite: any): Promise<void> {
    this.service.submitNewBite(newBite);

    this.loading = await this.loadingController.create({
      duration: 3000,
    });

    await this.loading.present();
  }

  navigationEffect = effect(async () => {
    const biteIdUploadingImage = this.service.biteIdWithUploadingImage();

    if (!biteIdUploadingImage) {
      return;
    }

    const uploadProgress = this.service.uploadingProgressForBiteImage();
    if (!uploadProgress) {
      return;
    }

    const uploadParams = uploadProgress[biteIdUploadingImage];
    if (!uploadParams) {
      return;
    }

    if (uploadParams.evt?.completed) {
      setTimeout(() => {
        this.loading?.dismiss();
        this.navController.navigateBack(['home']);
      }, 3000);
      return;
    }

    if (uploadParams.err) {
      const uploadErrorAlert = await this.alertController.create({
        header: 'Image Upload Failed',
        message:
          'There was an error uploading the image. Please take a screenshot of ' +
          'this message and send it to the Discord Channel.' +
          '' +
          'Error:' +
          '' +
          `${uploadParams.err.message || uploadParams.err}`,
        backdropDismiss: false,
        buttons: [
          {
            text: 'OK',
            handler: (): void => {
              this.loading?.dismiss();
            },
          },
        ],
      });

      await uploadErrorAlert.present();
      return;
    }
  });
}
