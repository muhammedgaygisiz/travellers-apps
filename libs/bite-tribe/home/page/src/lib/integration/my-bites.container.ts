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
      [showSpinner]="true"
      [isBitesLoading]="service.isBitesLoading()"
      [isReloading]="service.isReloading()"
      [hasErrorLoadingGpsPosition]="service.hasErrorLoadingGpsPosition()"
      [sorting]="service.myBitesSorting()"
      showSearch
      editableBites
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (menuNavigate)="service.onMenuNavigate($event)"
      (gotoEdit)="service.onGotoEditClick($event)"
      (deleteBite)="service.onDeleteBiteClick($event)"
      (openMapView)="service.openMapView('my-bites')"
      (sortingChange)="service.myBitesSortingChange($event)"
      (refresh)="service.refresh()"
      (closeGpsError)="service.closeGpsError()"
      (rateNowClick)="service.rateNowClicked($event)"
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
