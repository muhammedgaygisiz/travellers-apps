import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { BitePlaceComponent } from '../components/page/bite-place.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bite-place
      class="ion-page"
      [bite]="service.bite()"
      [bites]="service.bites()"
      [userId]="service.userId()"
      (showBitesClick)="service.navigateToPlaceBites($event)"
      (biteClick)="service.biteClicked($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
    />
  `,
  imports: [BitePlaceComponent],
})
export class UnverifiedRestaurantContainer {
  service = inject(RestaurantService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Unverified Restaurant',
    });
  }
}
