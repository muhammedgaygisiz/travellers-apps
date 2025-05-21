import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Restaurant } from 'model';

@Injectable({
  providedIn: 'root',
})
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  restaurantToCreate = toSignal(this.storeService.restaurantToCreate$);

  submitNewRestaurant(restaurant: Restaurant) {
    this.storeService.save(restaurant, 'restaurant');
  }
}
