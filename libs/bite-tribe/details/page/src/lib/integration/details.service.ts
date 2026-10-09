import { inject, Injectable } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import { LocalImagePickerService } from 'bite-tribe-common/bite';
import { DetailsDataAccessService } from 'bite-tribe/details-data-access';
import {
  Bite,
  BiteReportReason,
  Bucketlist,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
} from 'model';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { ToastService } from 'toast';

@Injectable({ providedIn: 'root' })
export class DetailsService {
  dataAccess = inject(DetailsDataAccessService);
  private readonly biteDataAccess = inject(BiteDataAccessService);
  private readonly localImagePicker = inject(LocalImagePickerService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

  bite = this.dataAccess.bite;

  /**
   * The Bite itself, never read off the resource directly: `value()` throws once
   * a read has failed. See GitHub issue #1232.
   */
  biteValue = this.dataAccess.biteValue;
  biteCreatorValue = this.dataAccess.biteCreatorValue;
  reviewThreads = this.dataAccess.reviewThreads;
  highlightedThreadId = this.dataAccess.highlightedThreadId;
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

  saveReviewReply(reply: {
    review: string;
    biteId: string;
    parentReviewId: string;
    threadId: string;
  }): void {
    this.dataAccess.saveReviewReply(reply);
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

  /**
   * Opens the menu the Bite was ordered from (issue #1113).
   *
   * The restaurant's menu, not the dish: `restaurant/:restaurantId/menu`
   * resolves which menu that is and redirects, so this works for a Bite whose
   * dish has since been deleted - which is the case the issue asks to survive.
   * Nothing is read off the menu to render the Bite, so a rename changes what
   * the guest finds on arrival and nothing about the page they left.
   */
  onMenuItemClick(bite: Bite): void {
    if (!bite.restaurantId) {
      return;
    }

    void this.navController.navigateForward([
      PATH.RESTAURANT,
      bite.restaurantId,
      PATH.MENU,
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

  /**
   * Files the report and tells the reporter it was received (GitHub issue
   * #1608).
   *
   * A second report from the same account is answered as received too, in its
   * own words: the Bite is already in front of an operator, which is all a
   * second tap could ask for. A failure says so, because a reporter told their
   * report went through when it did not will not file it again.
   */
  async reportBite(report: {
    biteId: string;
    reason: BiteReportReason;
  }): Promise<void> {
    try {
      const { reported } = await this.dataAccess.reportBite(
        report.biteId,
        report.reason,
      );

      await this.toast.present({
        messageKey: reported ? 'report-bite-sent' : 'report-bite-already-sent',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to report the Bite:', error);

      await this.toast.present({
        messageKey: 'report-bite-failed',
        outcome: 'failure',
      });
    }
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
