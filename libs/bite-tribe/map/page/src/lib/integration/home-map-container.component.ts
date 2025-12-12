import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapService } from './map.service';

import { MapPageComponent } from '../components/map-page/map-page.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'home-map-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPageComponent],
  template: `
    <map-page
      class="ion-page"
      [bites]="service.bites()"
      [isAuthenticated]="service.isAuthenticated()"
      [gpsPosition]="service.gpsPosition()"
      [userId]="service.userId()"
      [enableZoom]="service.enableZoom()"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyProfile)="service.onGotoMyProfileClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
    />
  `,
})
export class HomeMapContainerComponent {
  service = inject(MapService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Home Map',
    });
  }
}
