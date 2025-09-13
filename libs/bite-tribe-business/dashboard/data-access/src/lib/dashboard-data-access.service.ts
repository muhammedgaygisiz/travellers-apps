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
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  logout(): void {
    this.storeService.logout();
  }

  selectRestaurantToCreate(restaurant: Restaurant): void {
    this.storeService.selectRestaurantToCreate(restaurant);
  }
}
