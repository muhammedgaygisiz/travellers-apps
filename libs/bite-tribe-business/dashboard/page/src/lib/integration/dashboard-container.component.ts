import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardComponent } from '../component/page/dashboard.component';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DashboardComponent],
  template: `
    <bt-business-dashboard
      class="ion-page"
      [organisations]="service.organisations.value()"
      [restaurants]="service.restaurants.value()"
      [isAuthenticated]="service.isAuthenticated()"
      [gpsPosition]="service.gpsPosition()"
      (logoutClick)="service.logout()"
      (createRestaurantClick)="service.onCreateRestaurantClick($event)"
      (restaurantClick)="service.restaurantClicked($event)"
      (gotoMigrations)="service.gotoMigrations()"
    />
  `,
})
export class DashboardContainer {
  service = inject(DashboardService);
}
