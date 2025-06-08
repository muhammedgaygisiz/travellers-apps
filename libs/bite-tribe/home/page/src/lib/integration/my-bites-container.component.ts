import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      title="My Bites"
      [showFooter]="false"
      [showAddButton]="false"
      [enableBackButton]="true"
      [bites]="service.myBites()"
      [userId]="service.userId()"
      editableBites
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (gotoSettings)="service.onGotoSettingsClick()"
      (gotoMyBites)="service.onGotoMyBitesClick()"
      (gotoEdit)="service.onGotoEditClick($event)"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class MyBitesContainerComponent {
  service = inject(HomeService);
}
