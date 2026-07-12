import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { BitePlaceComponent } from '../components/page/bite-place/bite-place.component';
import { RestaurantService } from './restaurant.service';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';

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
  private readonly analytics = inject(AnalyticsService);

  ionViewDidEnter(): void {
    void FirebaseAnalytics.setCurrentScreen({
      screenName: 'Unverified Restaurant',
    });
    this.analytics.logEvent(AnalyticsEvent.RestaurantViewed, {
      verified: false,
    });
  }
}
