import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../component/page/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardComponent],
  template: `
    <bt-business-dashboard
      class="ion-page"
      [restaurants]="service.restaurants()"
      [isAuthenticated]="service.isAuthenticated()"
      (logoutClick)="service.logout()"
      (createRestaurantClick)="service.onCreateRestaurantClick($event)"
      (restaurantClick)="service.restaurantClicked($event)"
    />
  `,
})
export class DashboardContainer {
  service = inject(DashboardService);
}
