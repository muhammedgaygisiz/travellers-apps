import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteService } from './bite.service';
import { BitePage } from '../components/page/bite.page';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <bite
    class="ion-page"
    [bite]="service.cachedBite()"
    [currency]="service.currency()"
    [position]="service.position()"
    [image]="service.imageToDisplay() || ''"
    [isNew]="true"
    (startCropImage)="service.startCropImage($event)"
    (submitBite)="service.submitNewBite($event)"
  />`,
  imports: [BitePage],
})
export class BiteContainer {
  service = inject(BiteService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'New Bite',
    });
  }
}
