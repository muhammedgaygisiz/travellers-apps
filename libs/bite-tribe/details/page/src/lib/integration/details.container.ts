import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DetailsPage } from '../components/details-page/details.page';
import { DetailsService } from './details.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  template: `
    <details-page
      class="ion-page"
      [bite]="service.bite.value()"
      [uploadState]="service.uploadState()"
      [reviews]="service.reviews()"
      [bucketlists]="service.bucketlists()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [position]="service.position.value()"
      [exchangeRates]="service.exchangeRates()"
      [preferredCurrency]="service.preferredCurrency()"
      [biteCreator]="service.biteCreator.value()"
      (submitNewReview)="service.saveReview($event)"
      (selectList)="service.addBiteToSelectedBucketList($event)"
      (removeBiteFromBucketlist)="service.removeBiteFromBucketlist($event)"
      (newList)="service.saveBiteToBucketListWithNewList($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (logoutClick)="service.logout()"
      (restaurantClick)="service.onRestaurantClick($event)"
      (goToProfile)="service.onGoToProfileClick($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
      (gotoNew)="service.onGotoNewClick($event)"
      (shareBite)="service.onShareBiteClick($event)"
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

    // Reset the resources otherwise error state will cause issues
    this.service.bite.reload();
    this.service.position.reload();
    this.service.biteCreator.reload();
  }
}
