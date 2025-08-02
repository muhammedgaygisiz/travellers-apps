import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      [bites]="service.sortedHomeBites()"
      [allTags]="service.allTags()"
      [selectedFilters]="service.homeFilters()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [showSpinner]="true"
      [isBitesLoading]="service.isBitesLoading()"
      [sorting]="service.sorting()"
      [distance]="service.homeDistance()"
      [preferedCurrency]="service.preferedCurrency()"
      [maxPriceFilter]="service.maxPriceHome()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
      (openMapView)="service.openMapView('home')"
      (sortingChange)="service.sortingChange($event)"
      (filtersChanged)="service.filtersChanged($event)"
      (filterCleared)="service.filtersCleared()"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class HomeContainerComponent {
  service = inject(HomeService);

  ionViewDidEnter() {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Home',
    });
  }
}
