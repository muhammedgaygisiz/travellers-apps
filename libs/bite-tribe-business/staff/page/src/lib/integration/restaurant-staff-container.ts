import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantStaffComponent } from '../component/restaurant-staff.component';
import { RestaurantStaffService } from './restaurant-staff.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantStaffComponent],
  template: `
    <bt-business-restaurant-staff
      class="ion-page"
      [staff]="service.staff()"
      [restaurantName]="service.restaurantName()"
      [loading]="service.loading()"
      [saving]="service.saving()"
      [isAuthenticated]="service.isAuthenticated()"
      (addStaff)="service.addStaff($event)"
      (removeStaff)="service.removeStaff($event)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantStaffContainer {
  service = inject(RestaurantStaffService);
}
