import { inject, Injectable } from '@angular/core';
import { RestaurantDataAccessService } from 'bite-tribe-business/restaurant-data-access';

@Injectable({ providedIn: 'root' })
export class RestaurantService {
  private readonly dataAccess = inject(RestaurantDataAccessService);

  restaurantToCreate = this.dataAccess.restaurantToCreate;
}
