import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      [bites]="service.bites()"
      [allTags]="service.allTags()"
      [selectedFilters]="service.homeFilters()"
      [userId]="service.userId()"
      [isAuthenticated]="service.isAuthenticated()"
      [showSpinner]="true"
      [isBitesLoading]="service.isBitesLoading()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoMyBucketlists)="service.onGotoMyBucketlists()"
      (openMapView)="service.openMapView('home')"
      (filtersApplied)="service.setHomeFilters($event)"
      (filtersCleared)="service.clearHomeFilters()"
      (filterRemoved)="service.removeHomeFilter($event)"
      (nearbyFilterToggled)="service.toggleNearbyFilter()"
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
