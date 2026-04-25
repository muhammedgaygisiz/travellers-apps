import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NewRestaurantPageComponent } from '../components/page/new-restaurant-page.component';
import { NewRestaurantService } from './new-restaurant.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NewRestaurantPageComponent],
  template: `
    <new-restaurant-page
      class="ion-page"
      [restaurant]="service.restaurantToCreate()"
      (submitNewRestaurant)="service.submitNewRestaurant($event)"
      (biteClick)="service.biteClicked($event)"
    />
  `,
})
export class NewRestaurantContainer {
  service = inject(NewRestaurantService);
}
