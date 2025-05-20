import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Restaurant } from 'model';
import { BiteTribeStoreService } from 'bite-tribe/store';

@Injectable({
  providedIn: 'root',
})
export class DashboardDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  restaurants = toSignal(this.storeService.restaurants$, {
    initialValue: [] as Restaurant[],
  });

  logout() {
    this.storeService.logout();
  }

  selectRestaurantToCreate(restaurant: Restaurant) {
    this.storeService.selectRestaurantToCreate(restaurant);
  }
}
