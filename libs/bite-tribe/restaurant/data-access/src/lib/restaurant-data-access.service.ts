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

  submitSocialMediaLinks(restaurantId: string, links: Link[]): void {
    this.storeService.saveSocialMediaLinks(restaurantId, links);
  }

  submitLikeClick(likeType: { likeType: string; biteId: string }): void {
    const bites = this.bites();
    const userId = this.userId();

    const bite = bites?.find((bite) => bite.id === likeType.biteId);
    const likeFromUser = bite?.likes?.find(
      (like: any) =>
        like.userId === userId && like.likeType === likeType.likeType
    );

    if (likeFromUser) {
      this.storeService.removeLike(likeType);
      return;
    }

    this.storeService.submitLikeClick(likeType);
  }
}
