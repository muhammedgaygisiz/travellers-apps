import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantOverviewComponent } from '../components/overview/restaurant-overview.component';
import { EditRestaurantService } from './edit-restaurant.service';

/** The restaurant's overview, at `restaurant/:restaurantId` (#2183). */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <bt-restaurant-overview
      class="ion-page"
      [restaurant]="service.restaurant()"
      [guestBitesToLink]="service.guestBitesToLink.value() ?? 0"
      (openGuestBites)="service.gotoGuestBites($event.id, $event.menuId)"
      (openSection)="service.gotoSection($event)"
      (createMenu)="service.createMenu()"
      (editMenu)="service.gotoEditMenu($event.id, $event.menuId)"
      (manageStaff)="service.gotoStaff()"
      (editFloorPlan)="service.gotoFloorPlan()"
      (openTablePlan)="service.gotoTablePlan()"
    />
  `,
  imports: [RestaurantOverviewComponent],
})
export class RestaurantOverviewContainer {
  service = inject(EditRestaurantService);
}
