import { inject, Injectable } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import {
  Bite,
  Bucketlist,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
} from 'model';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';

@Injectable({ providedIn: 'root' })
export class DetailsService {
  dataAccess = inject(DetailsDataAccessService);
  private readonly biteDataAccess = inject(BiteDataAccessService);
  private readonly localImagePicker = inject(LocalImagePickerService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;

  /**
   * The Bite itself, never read off the resource directly: `value()` throws once
   * a read has failed. See GitHub issue #1232.
   */
  biteValue = this.dataAccess.biteValue;
  biteCreatorValue = this.dataAccess.biteCreatorValue;
  reviews = this.dataAccess.reviews;
  bucketlists = this.dataAccess.bucketlists;
  exchangeRates = this.dataAccess.exchangeRates;
  preferredCurrency = this.dataAccess.preferredCurrency;
  userId = this.dataAccess.userId;
  isAuthenticated = this.dataAccess.isAuthenticated;
  biteCreator = this.dataAccess.biteCreator;
  position = this.dataAccess.position;
  biteNotFound = this.dataAccess.biteNotFound;
  biteUnavailable = this.dataAccess.biteUnavailable;

  /** Runs the failed read again, without leaving the page. */
  retryBiteLoad(): void {
    this.dataAccess.reloadBite();
  }

  /**
   * Leaves a Bite that no longer exists. The page it was opened from — gallery,
   * feed or a shared link — is whatever the navigation stack holds, so this
   * hands back rather than routing anywhere specific.
   */
  goBack(): void {
    this.navController.back();
  }

  saveReview(newReview: { review: string; biteId: string }): void {
    this.dataAccess.saveNewReview(newReview);
  }

  addBiteToSelectedBucketList(list: Bucketlist): void {
    const currBite = this.biteValue();

    this.dataAccess.saveToBucketList({
      bucketListId: list.id,
      biteId: currBite?.id,
    });
  }

  /**
   * The list and its first Bite are created in one write, so a Bite that is not
   * loaded yet would silently produce an empty list. See GitHub issue #1231.
   */
  saveBiteToBucketListWithNewList(newListName: string): void {
    const biteId = this.biteValue()?.id;

    if (!biteId) {
      return;
    }

    this.dataAccess.createAndSaveToBucketList({
      bucketListName: newListName,
      biteId,
    });
  }

  removeBiteFromBucketlist($event: RemoveBiteFromBucketlistParams): void {
    this.dataAccess.removeBiteFromBucketlist($event);
  }

  likeButtonClicked(likeClick: LikeClick): void {
    this.dataAccess.submitLikeClick(likeClick);

    const timeout = setTimeout(() => {
      this.bite.reload();
      clearTimeout(timeout);
    }, 1000);
  }

  logout(): void {
    this.dataAccess.logout();
  }

  onRestaurantClick(bite: Bite): void {
    if (bite.id && bite.restaurantId) {
      void this.navController.navigateForward([
        'bite',
        bite.id,
        'restaurant',
        bite.restaurantId,
      ]);

      return;
    }

    void this.navController.navigateForward([
      'bite',
      bite.id,
      PATH.RESTAURANT,
      PATH.PLACE,
      encodeURIComponent(bite.place),
    ]);
  }

  onGoToProfileClick(publicUser: PublicUser): void {
    this.navController.navigateForward(['profile', publicUser.userId]);
  }

  onGotoEditClick(biteToEdit: Bite): void {
    this.navController.navigateForward(['bite', biteToEdit.id, 'edit']);
  }

  onGotoNewClick(originalBite: Bite): void {
    const userAgnosticBiteInfo = {
      name: originalBite.name,
      place: originalBite.place,
      price: originalBite.price,
      currency: originalBite.currency,
      restaurantId: originalBite.restaurantId,
      position: originalBite.position,
    } as Partial<Bite>;
    this.dataAccess.cacheBite(userAgnosticBiteInfo);
    this.navController.navigateForward(['new-bite']);
  }

  onShareBiteClick(bite: Bite): void {
    this.dataAccess.shareBite(bite);
  }

  /**
   * Re-sends a Bite photo whose upload never made it, in one of two flows
   * depending on whether this device still holds the Bite's own copy: a recent
   * Bite posted from here is re-sent straight away, while an older one — or one
   * posted from another device — asks the user to pick from the photos saved
   * locally, the same set the gallery shows. Picking nothing cancels.
   *
   * Presenting the picker is a workflow decision, so it lives here rather than
   * in the card that raised the request. See GitHub issue #1168.
   */
  async retryBiteImageUpload(bite: Bite): Promise<void> {
    const localCopy = await this.biteDataAccess.findLocalImageForBite(bite.id);
    const fileUri = localCopy?.uri ?? (await this.localImagePicker.pick())?.uri;

    if (fileUri) {
      await this.biteDataAccess.retryImageUpload(bite, fileUri);
    }
  }
}
