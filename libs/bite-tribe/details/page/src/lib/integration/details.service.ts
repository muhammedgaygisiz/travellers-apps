import { EventEmitter, inject, Injectable, signal } from '@angular/core';
import { BiteDataAccessService } from 'bite-tribe/bite-data-access';
import {
  canShareBiteAsImage,
  LocalImagePickerService,
} from 'bite-tribe-common/bite';
import {
  DetailsDataAccessService,
  isShareCancelled,
  SaveImageDeniedError,
  ShareImageUnavailableError,
} from 'bite-tribe/details-data-access';
import {
  DEFAULT_SHARE_IMAGE_STYLE,
  ShareImageComposerComponent,
  type ShareImageFormat,
  type ShareImageLayoutId,
} from 'bite-tribe/share-image-ui';
import { TranslocoService } from '@jsverse/transloco';
import { Capacitor } from '@capacitor/core';
import {
  Bite,
  BiteReportReason,
  Bucketlist,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
} from 'model';
import {
  ActionSheetController,
  ModalController,
  NavController,
} from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { ToastService } from 'toast';
import {
  AnalyticsEvent,
  type AnalyticsEventParamMap,
  AnalyticsService,
  type ShareImageAction,
  type ShareImageParams,
  type ShareTarget,
} from 'ta-firestore';

/** The share menu's entries that lead to the image composer. */
type ShareMenuTarget = 'instagram-story' | 'instagram-post' | 'facebook-story';

/** The menu entry decides the format (`UC-SBS` `R-5`). */
const FORMAT_FOR_TARGET: Record<ShareMenuTarget, ShareImageFormat> = {
  'instagram-story': 'story',
  'instagram-post': 'post',
  'facebook-story': 'story',
};

/**
 * The browser's entries. A browser can open no app directly, so it offers the
 * composer only to save the image or hand it to the share sheet (`R-12`).
 */
type WebShareMenuEntry = 'save-image' | 'share-image';

type ShareMenuChoice = ShareMenuTarget | WebShareMenuEntry | 'more';

interface ShareMenuEntry {
  choice: ShareMenuChoice;
  labelKey: string;
}

/**
 * Each menu entry as the share funnel's analytics names it (issue #1733): the
 * same entry, in the underscores GA4 values use.
 */
const ANALYTICS_TARGET: Record<ShareMenuChoice, ShareTarget> = {
  'instagram-story': 'instagram_story',
  'instagram-post': 'instagram_post',
  'facebook-story': 'facebook_story',
  'save-image': 'save',
  'share-image': 'share_image',
  more: 'more',
};

const NATIVE_SHARE_MENU: ShareMenuEntry[] = [
  { choice: 'instagram-story', labelKey: 'share-menu-instagram-story' },
  { choice: 'instagram-post', labelKey: 'share-menu-instagram-post' },
  { choice: 'facebook-story', labelKey: 'share-menu-facebook-story' },
  { choice: 'more', labelKey: 'share-menu-more' },
];

@Injectable({ providedIn: 'root' })
export class DetailsService {
  dataAccess = inject(DetailsDataAccessService);
  private readonly biteDataAccess = inject(BiteDataAccessService);
  private readonly localImagePicker = inject(LocalImagePickerService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);
  private readonly actionSheetController = inject(ActionSheetController);
  private readonly modalController = inject(ModalController);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

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

  /**
   * The share button (`UC-SBS` `R-1` to `R-3`).
   *
   * On the viewer's own Bite it opens BiteTribe's share menu: the three app
   * entries lead to the image composer, and **More…** is the link share,
   * unchanged. Every other Bite keeps the link share alone, with no menu,
   * until the terms of use of issue #1772 let anyone else's photo be shared.
   *
   * Each step of the menu and the composer is an event of the share funnel
   * (`UC-SBS` `R-29`, issue #1733). The link share on somebody else's Bite opens
   * no menu and is not part of it.
   */
  async onShareBiteClick(bite: Bite): Promise<void> {
    if (!canShareBiteAsImage(bite, this.userId())) {
      await this.dataAccess.shareBite(bite);
      return;
    }

    const choice = await this.presentShareMenu(bite);

    if (!choice) {
      return;
    }

    const target = ANALYTICS_TARGET[choice];
    this.analytics.logEvent(AnalyticsEvent.ShareTargetChosen, {
      bite_id: bite.id,
      target,
    });

    if (choice === 'more') {
      await this.dataAccess.shareBite(bite);
    } else if (choice === 'save-image' || choice === 'share-image') {
      await this.openShareImageComposer(bite, 'story', target);
    } else {
      await this.openShareImageComposer(
        bite,
        FORMAT_FOR_TARGET[choice],
        target,
      );
    }
  }

  /**
   * The menu's entries for this platform. A device offers the apps; a browser
   * offers Save image, Share image… only where it can share files, and More…
   * (`UC-SBS` `R-1`, `R-12`).
   */
  private shareMenuEntries(): ShareMenuEntry[] {
    if (Capacitor.isNativePlatform()) {
      return NATIVE_SHARE_MENU;
    }

    return [
      { choice: 'save-image', labelKey: 'share-menu-save-image' },
      ...(this.dataAccess.canShareImageFiles()
        ? [
            {
              choice: 'share-image' as const,
              labelKey: 'share-menu-share-image',
            },
          ]
        : []),
      { choice: 'more', labelKey: 'share-menu-more' },
    ];
  }

  private async presentShareMenu(
    bite: Bite,
  ): Promise<ShareMenuChoice | undefined> {
    const t = (key: string): string => this.transloco.translate(key);
    const sheet = await this.actionSheetController.create({
      header: t('share-menu-title'),
      buttons: [
        ...this.shareMenuEntries().map(({ choice, labelKey }) => ({
          text: t(labelKey),
          data: choice,
          htmlAttributes: { 'data-testid': `share-menu-${choice}` },
        })),
        { text: t('cancel'), role: 'cancel' },
      ],
    });

    await sheet.present();
    this.analytics.logEvent(AnalyticsEvent.ShareMenuOpened, {
      bite_id: bite.id,
    });

    const { data } = await sheet.onDidDismiss<ShareMenuChoice>();

    return data;
  }

  private async openShareImageComposer(
    bite: Bite,
    format: ShareImageFormat,
    target: ShareTarget,
  ): Promise<void> {
    // What every later step of the funnel says about this image. The layout
    // follows the user's picks, so a hand-off names the one that went out.
    const funnel: ShareImageParams = {
      bite_id: bite.id,
      target,
      format,
      template: DEFAULT_SHARE_IMAGE_STYLE.layout,
    };
    const closed = new EventEmitter<void>();
    const layoutChosen = new EventEmitter<ShareImageLayoutId>();
    const modal = await this.modalController.create({
      component: ShareImageComposerComponent,
      // Taller than Ionic's default on large screens; see `_globals.scss`.
      cssClass: 'share-image-composer-modal',
      componentProps: {
        // Ionic assigns componentProps onto the instance, so inputs are handed
        // over as signals - see `LocalImagePickerService`.
        bite: signal(bite),
        format: signal(format),
        creatorName: signal(this.sharerDisplayName()),
        saveImage: signal((image: Blob) =>
          this.saveBiteImage(bite, image, funnel),
        ),
        // Absent where the platform cannot share a file, which hides the action.
        shareImage: signal(
          this.dataAccess.canShareImageFiles()
            ? (image: Blob): Promise<void> =>
                this.shareBiteImage(bite, image, funnel)
            : undefined,
        ),
        closed,
        layoutChosen,
      },
    });

    closed.subscribe(() => {
      void modal.dismiss();
    });

    layoutChosen.subscribe((template) => {
      funnel.template = template;
      this.analytics.logEvent(AnalyticsEvent.ShareTemplateChosen, {
        ...funnel,
      });
    });

    await modal.present();
    this.analytics.logEvent(AnalyticsEvent.ShareComposerOpened, {
      bite_id: bite.id,
      target,
      format,
    });
  }

  /**
   * The name the sharer may put on their image: their BiteTribe display name,
   * read from their profile document, and only while that profile is public
   * (`UC-SBS` `R-8`, `R-9`). Only the sharer's own Bites reach the composer,
   * so the Bite's creator is the sharer.
   */
  private sharerDisplayName(): string | undefined {
    const creator = this.biteCreatorValue();

    return creator?.public ? creator.displayName || undefined : undefined;
  }

  /** Saves the composed image and says how that went. */
  private async saveBiteImage(
    bite: Bite,
    image: Blob,
    funnel: ShareImageParams,
  ): Promise<void> {
    try {
      await this.dataAccess.saveBiteImage(bite, image);
      this.analytics.logEvent(AnalyticsEvent.ShareHandoffSucceeded, {
        ...funnel,
        action: 'save',
      });
      await this.toast.present({
        messageKey: Capacitor.isNativePlatform()
          ? 'share-image-saved'
          : 'share-image-downloaded',
        outcome: 'success',
      });
    } catch (error) {
      if (error instanceof SaveImageDeniedError) {
        this.logHandoffFailed(funnel, 'save', 'permission_denied');
        await this.toast.present({
          messageKey: 'share-image-save-denied',
          outcome: 'failure',
        });
        return;
      }

      console.error('Failed to save the Bite image:', error);
      this.logHandoffFailed(funnel, 'save', 'failed');

      await this.toast.present({
        messageKey: 'share-image-save-failed',
        outcome: 'failure',
      });
    }
  }

  /**
   * Shares the composed image and reports a failure. The composer stays open
   * either way, so a cancelled or failed share can simply be tried again.
   */
  private async shareBiteImage(
    bite: Bite,
    image: Blob,
    funnel: ShareImageParams,
  ): Promise<void> {
    try {
      await this.dataAccess.shareBiteImage(bite, image);
      this.analytics.logEvent(AnalyticsEvent.ShareHandoffSucceeded, {
        ...funnel,
        action: 'share',
      });
    } catch (error) {
      if (isShareCancelled(error)) {
        this.logHandoffFailed(funnel, 'share', 'cancelled');
        return;
      }

      if (error instanceof ShareImageUnavailableError) {
        this.logHandoffFailed(funnel, 'share', 'unavailable');
        await this.toast.present({
          messageKey: 'share-image-unavailable',
          outcome: 'failure',
        });
        return;
      }

      console.error('Failed to share the Bite image:', error);
      this.logHandoffFailed(funnel, 'share', 'failed');

      await this.toast.present({
        messageKey: 'share-image-failed',
        outcome: 'failure',
      });
    }
  }

  private logHandoffFailed(
    funnel: ShareImageParams,
    action: ShareImageAction,
    reason: AnalyticsEventParamMap[typeof AnalyticsEvent.ShareHandoffFailed]['reason'],
  ): void {
    this.analytics.logEvent(AnalyticsEvent.ShareHandoffFailed, {
      ...funnel,
      action,
      reason,
    });
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
