import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapService } from './map.service';

import { MapPageComponent } from '../components/map-page/map-page.component';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';

@Component({
  selector: 'home-map-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPageComponent, CoachMarkComponent],
  template: `
    <map-page
      class="ion-page"
      [bites]="service.bites()"
      [isAuthenticated]="service.isAuthenticated()"
      [gpsPosition]="service.gpsPosition()"
      [userId]="service.userId()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
    />

    <bt-coach-mark
      surface="map"
      titleKey="coach-map-title"
      bodyKey="coach-map-body"
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
