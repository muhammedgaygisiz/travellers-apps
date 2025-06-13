import { inject, Injectable } from '@angular/core';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import { Bucketlist, RemoveBiteFromBucketlistParams } from 'model';
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

  saveNewTags(newTags: string) {
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
}
