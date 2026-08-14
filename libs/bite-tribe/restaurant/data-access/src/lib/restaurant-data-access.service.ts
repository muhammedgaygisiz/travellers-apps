import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { LikeClick } from 'model';

/**
 * Read side of a restaurant for the consumer app.
 *
 * Editing a restaurant is a business-app capability and its writes live in
 * `bite-tribe-business/restaurant-data-access`. They used to sit here, which
 * meant the business edit page reached across the scope boundary into the
 * consumer's library to reach them. See GitHub issue #1317.
 */
@Injectable({ providedIn: 'root' })
export class RestaurantDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);

  bite = toSignal(this.storeService.bite$);
  biteIdFromUrl = this.storeService.biteIdFromUrl;
  bites = toSignal(this.storeService.bitesByRestaurant$);
  userId = toSignal(this.storeService.userId$);
  restaurant = toSignal(this.storeService.restaurant$);

  submitLikeClick(likeClick: LikeClick): void {
    this.storeService.submitLikeClick(likeClick);
  }
}
