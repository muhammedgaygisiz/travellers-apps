import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MapPageComponent } from '../components/map-page/map-page.component';
import { MapService } from './map.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  selector: 'bucketlist-map-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapPageComponent],
  template: `
    <map-page
      class="ion-page"
      [bites]="service.bitesBySelectedBucketlist()"
      [isAuthenticated]="service.isAuthenticated()"
      [userId]="service.userId()"
      [enableZoom]="service.enableZoom()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
    />
  `,
})
export class BucketListMapContainerComponent {
  service = inject(MapService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bucketlist Map',
    });
  }
}
