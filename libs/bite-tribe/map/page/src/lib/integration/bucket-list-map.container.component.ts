import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapPageComponent } from '../components/map-page/map-page.component';
import { MapService } from './map.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'bucketlist-map-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPageComponent],
  template: `
    <map-page
      class="ion-page"
      [bites]="service.bitesBySelectedBucketlist()"
      [isAuthenticated]="service.isAuthenticated()"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
    />
  `,
})
export class BucketListMapContainerComponent {
  service = inject(MapService);

  ionViewDidEnter() {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bucketlist Map',
    });
  }
}
