import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RestaurantPhotos } from '../component/restaurant-photos/restaurant-photos';
import { RestaurantPhotosService } from './restaurant-photos.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RestaurantPhotos],
  template: `
    <lib-restaurant-photos
      class="ion-page"
      [restaurants]="service.restaurants()"
      [loading]="service.loading()"
      [attachingId]="service.attachingId()"
      (attach)="service.attach($event.restaurantId, $event.photo)"
      (logoutClick)="service.logout()"
    />
  `,
})
export class RestaurantPhotosContainer {
  readonly service = inject(RestaurantPhotosService);
}
