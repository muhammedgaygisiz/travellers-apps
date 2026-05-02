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
      [showHeaderMenu]="false"
      [showFooter]="false"
      [enableBackButton]="true"
      [showTriedOutCheckbox]="true"
      [triedOutBiteIds]="service.triedOutBiteIds()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [showAddButton]="false"
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyProfile)="service.onGotoMyProfileClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoEdit)="service.onGotoEditClick($event)"
      (gotoAbout)="service.onGotoAboutClick()"
      (openMapView)="service.openMapView('my-bucketlists')"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
      (triedOutChange)="service.toggleTriedOut($event)"
      (rateNowClick)="service.rateNowClicked($event)"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class BucketListContainer {
  service = inject(HomeService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bucket List',
    });
  }
}
