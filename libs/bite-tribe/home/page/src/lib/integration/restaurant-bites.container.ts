import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { HomeService } from './home.service';
import { BiteTribeHomeComponent } from '../components/page/home.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      [title]="service.biteById()?.place || 'Restaurant Bites'"
      [showFooter]="false"
      [showAddButton]="false"
      [enableBackButton]="true"
      [bites]="service.restaurantBites()"
      [userId]="service.userId()"
      [showHeaderMenu]="false"
      [showSpinner]="true"
      [isBitesLoading]="service.restaurantBitesLoading()"
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      [locationPermissionState]="service.locationPermissionState()"
      [sorting]="service.restaurantBitesSorting()"
      [showMap]="false"
      showSearch
      enableImageRetry
      (retryImageUpload)="service.retryBiteImageUpload($event)"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (menuNavigate)="service.onMenuNavigate($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
      (deleteBite)="service.onDeleteBiteClick($event)"
      (openMapView)="service.openMapView('restaurant-bites')"
      (sortingChange)="service.restaurantBitesSortingChange($event)"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
      (enableLocation)="service.enableLocation()"
      (rateNowClick)="service.rateNowClicked($event)"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class RestaurantBitesContainer {
  service = inject(HomeService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'Restaurant Bites',
    });
  }
}
