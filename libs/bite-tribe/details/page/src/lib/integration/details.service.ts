import { inject, Injectable } from '@angular/core';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import {
  Bite,
  Bucketlist,
  PublicUser,
  RemoveBiteFromBucketlistParams,
} from 'model';
import { NavController } from '@ionic/angular/standalone';

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

  saveNewTags(newTags: string[]) {
    this.dataAccess.saveNewTags(newTags);
  }

  saveReview(newReview: { review: string; biteId: string }) {
    this.dataAccess.saveNewReview(newReview);
  }

  addBiteToSelectedBucketList(list: Bucketlist) {
    const currBite = this.bite();

    this.dataAccess.saveToBucketList({
      bucketListId: list.id,
      biteId: currBite?.id,
    });
  }

  saveBiteToBucketListWithNewList(newListName: string) {
    const currBite = this.bite();

    this.dataAccess.createAndSaveToBucketList({
      bucketListName: newListName,
      biteId: currBite?.id,
    });
  }

  removeBiteFromBucketlist($event: RemoveBiteFromBucketlistParams) {
    this.dataAccess.removeBiteFromBucketlist($event);
  }

  likeButtonClicked(likeClick: { likeType: string; biteId: string }) {
    this.dataAccess.submitLikeClick(likeClick);
  }

  logout() {
    this.dataAccess.logout();
  }

  onGotoSettingsClick() {
    this.navController.navigateForward(['settings']);
  }

  onGotoMyBitesClick() {
    this.navController.navigateForward(['my-bites']);
  }

  onGotoMyBucketlists() {
    this.navController.navigateForward(['my-bucketlists']);
  }

  onRestaurantClick(bite: Bite) {
    if (bite.restaurantId) {
      // eslint-disable-next-line no-unused-vars
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

  onGoToProfileClick(publicUser: PublicUser) {
    this.navController.navigateForward(['profile', publicUser.userId]);
  }
}
