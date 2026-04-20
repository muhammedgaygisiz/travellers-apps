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
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      [sorting]="service.restaurantBitesSorting()"
      [showMap]="false"
      showSearch
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
      (deleteBite)="service.onDeleteBiteClick($event)"
      (openMapView)="service.openMapView('restaurant-bites')"
      (sortingChange)="service.restaurantBitesSortingChange($event)"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
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
