import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { RestaurantComponent } from '../components/page/restaurant.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <restaurant
      class="ion-page"
      [bite]="service.bite()"
      [bites]="service.bites()"
      [userId]="service.userId()"
      [restaurant]="service.restaurant()"
      (showBitesClick)="service.navigateToBites($event)"
      (biteClick)="service.biteClicked($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
    />
  `,
  imports: [RestaurantComponent],
})
export class UnverifiedRestaurantContainer {
  service = inject(RestaurantService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Unverified Restaurant',
    });
  }
}
