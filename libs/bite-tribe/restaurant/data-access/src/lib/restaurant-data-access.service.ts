import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { Link } from 'model';

@Injectable({ providedIn: 'root' })
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);
  bites = toSignal(this.storeService.bitesByRestaurant$);
  userId = toSignal(this.storeService.userId$);
  restaurant = toSignal(this.storeService.restaurant$);

  submitSocialMediaLinks(restaurantId: string, links: Link[]) {
    this.storeService.saveSocialMediaLinks(restaurantId, links);
  }
}
