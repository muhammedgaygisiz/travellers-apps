import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { DetailsPage } from '../components/details-page/details.page';
import { DetailsService } from './details.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { CoachMarkComponent } from 'bite-tribe/coach-mark';

@Component({
  template: `
    <details-page
      class="ion-page"
      [bite]="service.biteValue()"
      [reviewThreads]="service.reviewThreads()"
      [highlightedThreadId]="service.highlightedThreadId()"
      [bucketlists]="service.bucketlists()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [position]="service.position.value()"
      [exchangeRates]="service.exchangeRates()"
      [preferredCurrency]="service.preferredCurrency()"
      [biteCreator]="service.biteCreatorValue()"
      [biteNotFound]="service.biteNotFound()"
      [biteUnavailable]="service.biteUnavailable()"
      (goBack)="service.goBack()"
      (retryLoad)="service.retryBiteLoad()"
      (submitNewReview)="service.saveReview($event)"
      (submitReviewReply)="service.saveReviewReply($event)"
      (selectList)="service.addBiteToSelectedBucketList($event)"
      (removeBiteFromBucketlist)="service.removeBiteFromBucketlist($event)"
      (newList)="service.saveBiteToBucketListWithNewList($event)"
      (likeButtonClick)="service.likeButtonClicked($event)"
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
      (logoutClick)="service.logout()"
      (restaurantClick)="service.onRestaurantClick($event)"
      (goToProfile)="service.onGoToProfileClick($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
      (gotoNew)="service.onGotoNewClick($event)"
      (shareBite)="service.onShareBiteClick($event)"
    />

    <bt-coach-mark
      surface="bite-details"
      titleKey="coach-bite-details-title"
      bodyKey="coach-bite-details-body"
      [enabled]="!!service.biteValue()"
      (settled)="detailsCoachSettled.set(true)"
    />

    <bt-coach-mark
      surface="bite-details-share"
      titleKey="coach-bite-details-share-title"
      bodyKey="coach-bite-details-share-body"
      anchorTestId="bite-details-share"
      [enabled]="detailsCoachSettled()"
      (settled)="shareCoachSettled.set(true)"
    />

    <bt-coach-mark
      surface="bite-details-navigation"
      titleKey="coach-bite-details-navigation-title"
      bodyKey="coach-bite-details-navigation-body"
      anchorTestId="bite-details-navigation"
      [enabled]="shareCoachSettled()"
      (settled)="navigationCoachSettled.set(true)"
    />

    <bt-coach-mark
      surface="bite-details-bucket-list"
      titleKey="coach-bite-details-bucket-list-title"
      bodyKey="coach-bite-details-bucket-list-body"
      anchorTestId="bite-details-bucket-list"
      [enabled]="navigationCoachSettled()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DetailsPage, CoachMarkComponent],
})
export class DetailsContainer {
  service = inject(DetailsService);
  private readonly analytics = inject(AnalyticsService);

  protected readonly detailsCoachSettled = signal(false);
  protected readonly shareCoachSettled = signal(false);
  protected readonly navigationCoachSettled = signal(false);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Bite Details',
    });
    this.analytics.logEvent(AnalyticsEvent.BiteViewed);

    if (this.service.biteValue()?.id || this.service.bite.error()) {
      this.service.bite.reload();
    }

    if (this.service.position.error()) {
      this.service.position.reload();
    }

    if (this.service.biteCreator.error()) {
      this.service.biteCreator.reload();
    }
  }
}
