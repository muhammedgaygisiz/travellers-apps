import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantOwnership } from '../component/restaurant-ownership/restaurant-ownership';
import { RestaurantOwnershipService } from './restaurant-ownership.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantOwnership],
  template: `
    <lib-restaurant-ownership
      class="ion-page"
      [restaurants]="service.restaurants()"
      [accounts]="service.accounts()"
      [loading]="service.loading()"
      [saving]="service.saving()"
      [selected]="service.selected()"
      [staff]="service.staff()"
      [staffLoading]="service.staffLoading()"
      [staffSaving]="service.staffSaving()"
      (selectRestaurant)="service.select($event)"
      (assign)="
        service.assign($event.restaurantId, $event.ownerUserId, $event.reason)
      "
      (revoke)="service.revoke($event.restaurantId, $event.reason)"
      (addStaff)="service.addStaff($event.restaurantId, $event.email)"
      (removeStaff)="service.removeStaff($event.restaurantId, $event.member)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantOwnershipContainer {
  readonly service = inject(RestaurantOwnershipService);
}
