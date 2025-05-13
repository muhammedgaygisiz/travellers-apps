import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { BiteTribeHomeComponent } from '../components/page/home.component';
import { HomeService } from './home.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-home
      class="ion-page"
      [bites]="service.bites()"
      [userId]="service.userId()"
      (logoutClick)="service.logout()"
      (likeButtonClick)="service.likeButtonClicked($event)"
      (biteClick)="service.biteClicked($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (addButtonClick)="service.onAddButtonClicked()"
      (gotoSettings)="service.onGotoSettingsClick()"
    />
  `,
  imports: [BiteTribeHomeComponent],
})
export class HomeContainerComponent {
  service = inject(HomeService);
}
