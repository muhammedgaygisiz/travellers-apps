import { inject, Injectable } from '@angular/core';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import {
  Bite,
  Bucketlist,
  Like,
  PublicUser,
  RemoveBiteFromBucketlistParams,
} from 'model';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class DetailsService {
  dataAccess = inject(DetailsDataAccessService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;
  reviews = this.dataAccess.reviews;
  bucketlists = this.dataAccess.bucketlists;
  userId = this.dataAccess.userId;
  isAuthenticated = this.dataAccess.isAuthenticated;
  biteCreator = this.dataAccess.biteCreator;

  saveReview(newReview: { review: string; biteId: string }): void {
    this.dataAccess.saveNewReview(newReview);
  }

  addBiteToSelectedBucketList(list: Bucketlist): void {
    const currBite = this.bite();

    this.dataAccess.saveToBucketList({
      bucketListId: list.id,
      biteId: currBite?.id,
    });
  }

  saveBiteToBucketListWithNewList(newListName: string): void {
    const currBite = this.bite();

    this.dataAccess.createAndSaveToBucketList({
      bucketListName: newListName,
      biteId: currBite?.id,
    });
  }

  removeBiteFromBucketlist($event: RemoveBiteFromBucketlistParams): void {
    this.dataAccess.removeBiteFromBucketlist($event);
  }

  likeButtonClicked(likeClick: Like): void {
    this.dataAccess.submitLikeClick(likeClick);
  }

  logout(): void {
    this.dataAccess.logout();
  }

  onRestaurantClick(bite: Bite): void {
    if (bite.restaurantId) {
      const [empty, collectionName, restaurantId] =
        bite.restaurantId.split('/');

      this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        restaurantId,
      ]);

      return;
    }

    this.navController.navigateForward([
      'bite',
      bite.id,
      'restaurant',
      encodeURIComponent(bite.place),
    ]);
  }

  onGoToProfileClick(publicUser: PublicUser): void {
    this.navController.navigateForward(['profile', publicUser.userId]);
  }

  onGotoEditClick(biteToEdit: Bite): void {
    this.navController.navigateForward(['bite', biteToEdit.id, 'edit']);
  }
}
