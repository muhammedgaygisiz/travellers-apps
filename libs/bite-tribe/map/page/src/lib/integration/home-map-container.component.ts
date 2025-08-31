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
      (logoutClick)="service.logout()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
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
