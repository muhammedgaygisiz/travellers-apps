import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';
import { TripDetailService } from './trip-detail.service';

/**
 * A trip's page: its Bites, newest first, in the shared Bite list. The list
 * keeps the order the query returned, which is the trip's order (issue #2354).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TripDetailService],
  template: `
    <bt-home
      class="ion-page"
      [bites]="detail.bites() ?? []"
      [title]="detail.trip()?.title ?? ''"
      [titleCount]="detail.bites()?.length"
      [isBitesLoading]="detail.isLoading()"
      [showSpinner]="true"
      [emptyMessageKey]="
        detail.notFound() ? 'trip-not-found' : 'no-bites-in-this-trip'
      "
      [showHeaderMenu]="false"
      [showFooter]="false"
      [showFilters]="false"
      [showMap]="false"
      [enableBackButton]="true"
      [showAddButton]="false"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (menuNavigate)="service.onMenuNavigate($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
      (refresh)="detail.reload()"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class TripContainer {
  protected readonly service = inject(HomeService);
  protected readonly detail = inject(TripDetailService);
  private readonly route = inject(ActivatedRoute);

  ionViewWillEnter(): void {
    this.detail.enter(this.route.snapshot.paramMap.get('tripId') ?? '');
  }

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Trip' });
  }
}
