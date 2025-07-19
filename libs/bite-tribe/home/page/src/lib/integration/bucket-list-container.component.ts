import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      [bites]="service.bitesBySelectedBucketlist()"
      [title]="service.selectedBucketlistTitle()"
      [showFooter]="false"
      [enableBackButton]="true"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [showAddButton]="false"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoEdit)="service.onGotoEditClick($event)"
      (openMapView)="service.openMapView('my-bucketlists')"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class BucketlistContainerComponent {
  service = inject(HomeService);

  ionViewDidEnter() {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bucket List',
    });
  }
}
