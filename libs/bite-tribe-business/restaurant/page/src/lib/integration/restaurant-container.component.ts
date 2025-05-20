import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantPageComponent } from '../components/page/restaurant-page.component';
import { RestaurantService } from './restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantPageComponent],
  template: ` <restaurant-page [restaurant]="service.restaurantToCreate()" /> `,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
export class RestaurantContainer {
  service = inject(RestaurantService);
}
