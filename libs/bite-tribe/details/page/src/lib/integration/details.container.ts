import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DetailsPage } from '../components/details-page/details.page';
import { DetailsService } from './details.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <details-page
      class="ion-page"
      [bite]="service.bite()"
      [reviews]="service.reviews()"
      [bucketlists]="service.bucketlists()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [biteCreator]="service.biteCreator()"
      (submitNewReview)="service.saveReview($event)"
      (selectList)="service.addBiteToSelectedBucketList($event)"
      (removeBiteFromBucketlist)="service.removeBiteFromBucketlist($event)"
      (newList)="service.saveBiteToBucketListWithNewList($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (logoutClick)="service.logout()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyProfile)="service.onGotoMyProfileClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
      (restaurantClick)="service.onRestaurantClick($event)"
      (goToProfile)="service.onGoToProfileClick($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DetailsPage],
})
export class DetailsContainer {
  service = inject(DetailsService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bite Details',
    });
  }
}
