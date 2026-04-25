import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantComponent } from '../components/page/restaurant.component';
import { RestaurantService } from './restaurant.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <restaurant
      class="ion-page"
      [bite]="service.bite()"
      [bites]="service.bites()"
      [userId]="service.userId()"
      [restaurant]="service.restaurant()"
      (showMenuClick)="service.navigateToMenu($event)"
      (showBitesClick)="service.navigateToBites($event)"
      (biteClick)="service.biteClicked($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
    />
  `,
  imports: [RestaurantComponent],
})
export class RestaurantContainer {
  service = inject(RestaurantService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Restaurant',
    });
  }
}
