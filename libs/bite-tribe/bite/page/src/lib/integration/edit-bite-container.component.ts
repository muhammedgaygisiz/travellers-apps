import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
} from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { BitePage } from '../components/page/bite.page';
import { BiteService } from './bite.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bite
      class="ion-page"
      [bite]="service.biteValue()"
      [image]="service.image() || ''"
      [nearbyRestaurants]="service.nearbyRestaurants() || []"
      [suggestedTags]="service.tagSuggestionsForEditingBite() || []"
      [googlePlaces]="service.googlePlaces()"
      [googlePlacesLoading]="service.googlePlacesLoading()"
      (submitBite)="service.submitEditedBite($event)"
      (placeChange)="onPlaceChange($event)"
      (searchGooglePlaces)="service.searchGooglePlaces($event)"
    />
  `,
  imports: [BitePage],
})
export class EditBiteContainer {
  service = inject(BiteService);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  private failureReported = false;

  constructor() {
    effect(() => {
      if (!this.service.biteLoadFailed()) {
        // A retry puts the read back in flight, so a second failure is
        // reported again rather than leaving the form silently empty.
        this.failureReported = false;

        return;
      }

      if (this.failureReported) {
        return;
      }

      this.failureReported = true;
      void this.reportBiteLoadFailure();
    });
  }

  /**
   * An edit form for a Bite that never loaded is worse than no form: it looks
   * empty rather than unavailable, and submitting it would write that emptiness
   * back. The read is offered again, and otherwise the page is left.
   * See GitHub issue #1232.
   */
  private async reportBiteLoadFailure(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('bite-could-not-be-loaded'),
      message: this.transloco.translate(
        'this-bite-could-not-be-loaded-right-now',
      ),
      backdropDismiss: false,
      buttons: [
        {
          text: this.transloco.translate('go-back'),
          role: 'cancel',
          handler: (): void => this.service.goBack(),
        },
        {
          text: this.transloco.translate('try-again'),
          handler: (): void => this.service.retryBiteLoad(),
        },
      ],
    });

    await alert.present();
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Edit Bite',
    });
  }

  onPlaceChange(place: string): void {
    const currentBite = this.service.biteValue();
    if (currentBite) {
      this.service.setEditingBite({ ...currentBite, place });
    }
  }
}
