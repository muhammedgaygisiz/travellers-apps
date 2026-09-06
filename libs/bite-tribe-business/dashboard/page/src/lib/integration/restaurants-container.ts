import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantsComponent } from '../component/restaurants/restaurants';
import { DashboardService } from './dashboard.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantsComponent],
  template: `
    <bt-business-restaurants
      class="ion-page"
      [restaurants]="service.restaurantsValue()"
      [isAuthenticated]="service.isAuthenticated()"
      (restaurantClick)="service.restaurantClicked($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantsContainer {
  service = inject(DashboardService);
}
