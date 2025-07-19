import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapPageComponent } from '../components/map-page/map-page.component';
import { MapService } from './map.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPageComponent],
  template: `
    <map-page
      [bites]="service.myBites()"
      [isAuthenticated]="service.isAuthenticated()"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
    />
  `,
})
export class MyBitesMapContainerComponent {
  service = inject(MapService);

  ionViewDidEnter() {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'My Bites Map',
    });
  }
}
