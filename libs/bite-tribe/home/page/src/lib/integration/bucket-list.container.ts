import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';
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
      [enableTriedOutSwipe]="true"
      [triedOutBiteIds]="service.triedOutBiteIds()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [showAddButton]="false"
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (menuNavigate)="service.onMenuNavigate($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
      (openMapView)="service.openMapView('my-bucketlists')"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
      (enableLocation)="service.enableLocation()"
      (triedOutChange)="service.toggleTriedOut($event)"
      (rateNowClick)="service.rateNowClicked($event)"
    />

    <bt-coach-mark
      surface="bucket-list-swipe"
      titleKey="coach-bucket-list-swipe-title"
      bodyKey="coach-bucket-list-swipe-body"
      anchorTestId="bite-tried-out-swipe"
      [enabled]="hasBites()"
    />
  `,
  imports: [BiteTribeHomeComponent, CoachMarkComponent],
})
export class BucketListContainer {
  service = inject(HomeService);

  /**
   * The swipe mark teaches a gesture that needs something to swipe, so it waits
   * until the list actually has a Bite to anchor on.
   */
  protected readonly hasBites = computed(
    () => this.service.bitesBySelectedBucketlist().length > 0,
  );

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bucket List',
    });
  }
}
