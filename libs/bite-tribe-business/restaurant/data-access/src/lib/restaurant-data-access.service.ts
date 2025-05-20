import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  restaurantToCreate = toSignal(this.storeService.restaurantToCreate$);
}
