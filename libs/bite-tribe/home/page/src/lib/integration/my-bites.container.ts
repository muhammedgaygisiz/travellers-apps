import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      title="{{ 'my-bites' | transloco }}"
      [showFooter]="false"
      [showAddButton]="false"
      [enableBackButton]="true"
      [bites]="service.myBites()"
      [userId]="service.userId()"
      [showHeaderMenu]="false"
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      [sorting]="service.myBitesSorting()"
      showSearch
      editableBites
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
      (openMapView)="service.openMapView('my-bites')"
      (sortingChange)="service.myBitesSortingChange($event)"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
    />
  `,
  imports: [BiteTribeHomeComponent, TranslocoPipe],
})
export class MyBitesContainer {
  service = inject(HomeService);

  ionViewDidEnter(): void {
    FirebaseAnalytics.setCurrentScreen({
      screenName: 'My Bites',
    });
  }
}
