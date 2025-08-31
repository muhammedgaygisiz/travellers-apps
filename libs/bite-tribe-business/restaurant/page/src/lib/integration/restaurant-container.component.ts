import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantPageComponent } from '../components/page/restaurant-page.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantPageComponent],
  template: `
    <restaurant-page
      [restaurant]="service.restaurantToCreate()"
      (submitNewRestaurant)="service.submitNewRestaurant($event)"
      (biteClick)="service.biteClicked($event)"
    />
  `,
})
export class RestaurantContainer {
  service = inject(RestaurantService);
}
