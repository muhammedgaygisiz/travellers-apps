import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { PageComponent } from 'common/ui/page';
import {
  Bite,
  Bucketlist,
  LikeClick,
  PublicUser,
  RemoveBiteFromBucketlistParams,
  ReviewThread,
} from 'model';
import {
  AlertController,
  IonButton,
  IonContent,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonModal,
  IonSkeletonText,
  IonTextarea,
  PopoverController,
} from '@ionic/angular/standalone';
import { ImageViewerComponent, ImageViewerImage } from 'common/ui/image-viewer';
import { CurrencyPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom, map } from 'rxjs';
import { TimeAgoPipe } from './pipes/time-ago.pipe';
import { RoundDistancePipe, ToMetricPipe } from 'common/distance';
import { MapComponent } from 'bite-tribe-common/map';
import { BucketListSelectionComponent } from '../bucket-list-selection/bucket-list-selection.component';
import { GetBucketlistsIconPipe } from '../../pipes/get-bucketlists-icon.pipe';
import {
  BiteImageStatusComponent,
  GetImagePipe,
  getEffectiveImageStatus,
  getLikeCounts,
  getUserLikeType,
  LikesComponent,
} from 'bite-tribe-common/bite';
import { Platform } from '@ionic/angular';
import { AppLauncher } from '@capacitor/app-launcher';
import { StarRatingComponent } from 'common/ui/star-rating';
import { TagsInputComponent } from 'common/ui/tags';
import { Position } from '@capacitor/geolocation';
import { CalcDistancePipe } from './pipes/calc-distance.pipe';
import { ConvertToPreferredCurrencyPipe } from './pipes/convert-to-preferred-currency.pipe';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { getLocalizedRegionName } from 'bite-tribe-common/bite';
import {
  ReviewReplySubmit,
  ReviewThreadComponent,
} from '../review-thread/review-thread.component';

const NEW_LIST_NAME_INPUT = 'name';

@Component({
  selector: 'details-page',
  templateUrl: 'details.page.html',
  styleUrl: 'details.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    IonContent,
    CurrencyPipe,
    IonList,
    IonListHeader,
    IonLabel,
    IonItem,
    IonTextarea,
    IonButton,
    ReactiveFormsModule,
    TimeAgoPipe,
    ToMetricPipe,
    MapComponent,
    IonIcon,
    GetBucketlistsIconPipe,
    LikesComponent,
    StarRatingComponent,
    TagsInputComponent,
    RoundDistancePipe,
    CalcDistancePipe,
    ConvertToPreferredCurrencyPipe,
    GetImagePipe,
    IonSkeletonText,
    TranslocoPipe,
    BiteImageStatusComponent,
    IonModal,
    ImageViewerComponent,
    ReviewThreadComponent,
  ],
})
export class DetailsPage {
  bite = input<Bite>();

  /**
   * The review compartment as conversations rather than as a flat list. The
   * grouping is done in the store, so the page only decides how a thread looks
   * (issue #1283).
   */
  reviewThreads = input<ReviewThread[]>([]);

  /**
   * The thread a tapped reply notification asked for. It renders expanded and
   * marked so the reply the notification was about is the thing the user lands
   * on.
   */
  highlightedThreadId = input<string>();

  bucketlists = input<Bucketlist[]>([]);
  userId = input<string>();
  isAuthenticated = input(false);
  biteCreator = input<PublicUser>();
  position = input<Position>();
  exchangeRates = input<Record<string, number>>();
  preferredCurrency = input<string>();
  enableImageRetry = input(false, { transform: booleanAttribute });
  biteNotFound = input(false, { transform: booleanAttribute });
  biteUnavailable = input(false, { transform: booleanAttribute });

  /**
   * Mirrors the feed card: a photo that is still uploading, or whose upload was
   * abandoned, is reported instead of leaving an empty header. See GitHub issue
   * #1168.
   */
  protected readonly imageStatus = computed(() => {
    const bite = this.bite();

    return bite ? getEffectiveImageStatus(bite) : undefined;
  });

  selectList = output<Bucketlist>();
  shareBite = output<Bite>();
  removeBiteFromBucketlist = output<RemoveBiteFromBucketlistParams>();
  newList = output<string>();
  submitNewReview = output<{ review: string; biteId: string }>();
  submitReviewReply = output<{
    review: string;
    biteId: string;
    parentReviewId: string;
    threadId: string;
  }>();
  likeButtonClick = output<LikeClick>();
  readonly logoutClick = output();
  readonly restaurantClick = output<Bite>();
  readonly goToProfile = output<PublicUser>();
  readonly gotoEdit = output<Bite>();
  readonly gotoNew = output<Bite>();
  readonly retryImageUpload = output<Bite>();
  readonly goBack = output();
  readonly retryLoad = output();

  private readonly formBuilder = inject(FormBuilder);
  private popoverController = inject(PopoverController);
  private readonly platform = inject(Platform);
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);
  private readonly destroyRef = inject(DestroyRef);

  activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  private reportedFailure: 'not-found' | 'unavailable' | undefined;

  /**
   * The load-failure alert the page currently owns. Ionic mounts overlays on the
   * app root rather than inside the page, so without a reference to take down
   * there is nothing to take down: the alert survives the route change and sits
   * over whatever the user navigated back to. See GitHub issue #1304.
   */
  private loadFailureAlert: HTMLIonAlertElement | undefined;

  /**
   * Covers the gap between creating an alert and presenting it, so presenting
   * stays single-flight. A teardown settling the inputs, or a resource read
   * failing again, must not stack a second alert under the one on screen. See
   * GitHub issue #1304.
   */
  private presentingLoadFailure = false;

  /**
   * A failure that arrived while a report was in flight, and still owes an
   * answer. Without it the guard above drops that failure for good, and a page
   * that has given up says nothing at all - which is the state issue #1232 was
   * raised to end.
   */
  private pendingReport = false;

  private isDestroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.isDestroyed = true;

      void this.dismissLoadFailureAlert();
    });

    effect(() => {
      const failure = this.biteNotFound()
        ? 'not-found'
        : this.biteUnavailable()
          ? 'unavailable'
          : undefined;

      if (!failure) {
        // A retry puts the read back in flight, so the next failure is reported
        // again rather than leaving the page silent, and the alert about the
        // read that is no longer failing goes away with it.
        this.reportedFailure = undefined;

        void this.dismissLoadFailureAlert();

        return;
      }

      if (this.reportedFailure === failure) {
        return;
      }

      this.reportedFailure = failure;
      void this.reportLoadFailure(failure);
    });
  }

  private async reportLoadFailure(
    failure: 'not-found' | 'unavailable',
  ): Promise<void> {
    if (this.loadFailureAlert || this.presentingLoadFailure) {
      // A read that fails again while this report is still running would be
      // dropped here and never reach the screen. A cold start onto a Bite - a
      // tapped notification, a shared link - reads twice, so the page can give
      // up, recover and give up again inside one report. It is remembered
      // instead and answered below.
      this.pendingReport = true;

      return;
    }

    this.presentingLoadFailure = true;

    try {
      await this.presentLoadFailureAlert(failure);
    } finally {
      this.presentingLoadFailure = false;
    }

    if (!this.pendingReport) {
      return;
    }

    this.pendingReport = false;

    // Whatever the page is failing on now, rather than what was dropped: a
    // retry can settle on the other branch. A report that presented owns the
    // screen, and a read that recovered has nothing left to say.
    const current = this.reportedFailure;

    if (!this.isDestroyed && current && !this.loadFailureAlert) {
      await this.reportLoadFailure(current);
    }
  }

  /**
   * Writes the alert and puts it on screen, or drops it if there is no longer
   * that failure to report. Separate from `reportLoadFailure` so that giving up
   * here ends this attempt rather than the report, which still has to answer a
   * failure that arrived while this one was running.
   */
  private async presentLoadFailureAlert(
    failure: 'not-found' | 'unavailable',
  ): Promise<void> {
    await this.ensureTranslationsLoaded();

    const alert = await (failure === 'not-found'
      ? this.createBiteNotFoundAlert()
      : this.createBiteUnavailableAlert());

    // Creating is asynchronous, so the page can be gone, or the read can have
    // moved on, by the time there is an alert to show. Presenting it then
    // would leak exactly the overlay this is meant to prevent.
    if (this.isDestroyed || this.reportedFailure !== failure) {
      await alert.dismiss();

      return;
    }

    this.loadFailureAlert = alert;

    await alert.present();
  }

  /**
   * Waits for the active language before an alert is written.
   *
   * The alerts translate synchronously, and this page is reached cold - from a
   * tapped notification or a shared link - so a failure reported before the
   * language file has arrived would put raw keys on screen, which is the defect
   * issue #1186 fixed elsewhere. Loads are cached per language, so a language
   * already in memory costs nothing.
   */
  private async ensureTranslationsLoaded(): Promise<void> {
    try {
      await firstValueFrom(
        this.transloco.load(this.transloco.getActiveLang?.() || 'en'),
      );
    } catch (error) {
      // A failed load is no reason to withhold the failure: Transloco falls
      // back on its own, and the page must still say what happened.
      console.warn(
        'Failed to load translations for the load-failure alert:',
        error,
      );
    }
  }

  /**
   * Takes the alert down with the page that raised it. Its backdrop refuses
   * dismissal, so an alert left behind does not merely look wrong, it swallows
   * every tap on the page underneath. See GitHub issue #1304.
   */
  private async dismissLoadFailureAlert(): Promise<void> {
    const alert = this.loadFailureAlert;
    this.loadFailureAlert = undefined;

    await alert?.dismiss();
  }

  /**
   * A Bite that has been deleted leaves nothing to interact with, so the alert
   * refuses backdrop dismissal and offers only the way back. See GitHub issue
   * #1232.
   */
  private createBiteNotFoundAlert(): Promise<HTMLIonAlertElement> {
    return this.alertController.create({
      header: this.transloco.translate('bite-not-found'),
      message: this.transloco.translate('this-bite-is-no-longer-available'),
      backdropDismiss: false,
      buttons: [
        {
          text: this.transloco.translate('go-back'),
          handler: (): void => this.goBack.emit(),
        },
      ],
    });
  }

  /**
   * A read that failed for any other reason — a timeout, a rejected permission,
   * an App Check refusal — says nothing about the Bite, so unlike a deleted one
   * this offers the read again as well as the way back. Without it the page had
   * no answer at all and simply kept its skeleton running. See GitHub issue
   * #1232.
   */
  private createBiteUnavailableAlert(): Promise<HTMLIonAlertElement> {
    return this.alertController.create({
      header: this.transloco.translate('bite-could-not-be-loaded'),
      message: this.transloco.translate(
        'this-bite-could-not-be-loaded-right-now',
      ),
      backdropDismiss: false,
      buttons: [
        {
          text: this.transloco.translate('go-back'),
          role: 'cancel',
          handler: (): void => this.goBack.emit(),
        },
        {
          text: this.transloco.translate('try-again'),
          handler: (): void => this.retryLoad.emit(),
        },
      ],
    });
  }

  /**
   * The photo handed to the full-screen viewer, empty while it is closed.
   * Testers reached for pinch-zoom here first, which is what made the viewer
   * worth sharing with the gallery. See GitHub issue #1232.
   */
  private readonly viewedImageSrc = signal('');

  readonly viewerImages = computed<ImageViewerImage[]>(() => {
    const src = this.viewedImageSrc();

    return src ? [{ src, alt: 'Dish Image' }] : [];
  });

  openImageViewer(src: string): void {
    this.viewedImageSrc.set(src);
  }

  closeImageViewer(): void {
    this.viewedImageSrc.set('');
  }

  likeCounts = computed(() => getLikeCounts(this.bite()));
  userLikeType = computed(() => getUserLikeType(this.bite(), this.userId()));

  /**
   * A Bite the viewer created. Their own likes chip stays visible but is not a
   * control: liking your own Bite is not an available action. Read off the Bite
   * rather than the loaded creator profile, which is fetched *from* this same
   * field and is still absent on the first render. See GitHub issue #1401.
   */
  protected readonly isOwnBiteLike = computed(() => {
    const userId = this.userId();
    return !!userId && this.bite()?.userId === userId;
  });

  protected readonly biteLocation = computed(() => {
    const bite = this.bite();
    const lang = this.activeLang();

    if (bite) {
      return getLocalizedRegionName(bite, lang);
    }

    return '';
  });

  reviewFormGroup = this.formBuilder.nonNullable.group({
    review: ['', Validators.required],
  });

  isReviewFieldInvalid = toSignal(
    this.reviewFormGroup.valueChanges.pipe(
      map(() => {
        return !this.reviewFormGroup.valid;
      }),
    ),
    { initialValue: !this.reviewFormGroup.valid },
  );

  isBucketlistBite = computed(() => {
    const biteId = this.bite()?.id;
    const bucketlists = this.bucketlists() || [];
    if (!biteId) {
      return false;
    }

    return bucketlists.some((list) => list.biteIds?.includes(biteId));
  });

  saveReview(): void {
    if (!this.reviewFormGroup.valid) {
      return;
    }

    const formValue = this.reviewFormGroup.value;
    const newReview = formValue.review;

    const id = this.bite()?.id;

    if (!id) {
      return;
    }

    this.submitNewReview.emit({
      review: newReview || '',
      biteId: id,
    });

    this.reviewFormGroup.reset();
  }

  /**
   * Answers a review inside its thread. The Bite id comes from the page rather
   * than from the thread, so a reply cannot be attributed to a Bite other than
   * the one on screen.
   */
  saveReply(reply: ReviewReplySubmit): void {
    const biteId = this.bite()?.id;

    if (!biteId) {
      return;
    }

    this.submitReviewReply.emit({ ...reply, biteId });
  }

  editBite(bite: Bite | undefined): void {
    if (!bite) {
      return;
    }

    this.gotoEdit.emit(bite);
  }

  newBite(bite: Bite | undefined): void {
    if (!bite) {
      return;
    }

    this.gotoNew.emit(bite);
  }

  onNewList(newListName: string): void {
    this.newList.emit(newListName);
  }

  /**
   * Asks for the new list's name from the page rather than from the bucket list
   * popover. The popover dismisses itself on select, which destroys the
   * component and any overlay declared in its template, so the prompt has to
   * outlive it. See GitHub issue #1231.
   *
   * Ionic hands the alert's text inputs to the handler as an object keyed by
   * input name, not as an array, so the name is read by key.
   */
  async promptForNewList(): Promise<void> {
    const alert = await this.alertController.create({
      cssClass: 'new-bucket-list-alert',
      header: this.transloco.translate('please-enter-a-name-for-your-new-list'),
      inputs: [
        {
          name: NEW_LIST_NAME_INPUT,
          placeholder: this.transloco.translate('name'),
        },
      ],
      buttons: [
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('save'),
          handler: (values: Record<string, string>): boolean => {
            const newListName = values?.[NEW_LIST_NAME_INPUT]?.trim();

            if (!newListName) {
              return false;
            }

            this.onNewList(newListName);

            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  async showBucketListsSelection($event: MouseEvent): Promise<void> {
    const popover = await this.popoverController.create({
      component: BucketListSelectionComponent,
      event: $event,
      dismissOnSelect: true,
      cssClass: 'bucket-list-popover',
      alignment: 'center',
      componentProps: {
        bucketLists: this.bucketlists,
        bite: this.bite,
        selectList: this.selectList,
        removeBiteFromBucketlist: this.removeBiteFromBucketlist,
        requestNewList: this.promptForNewList.bind(this),
      },
    });

    await popover.present();
  }

  onRestaurantClick(biteData: Bite | undefined): void {
    if (biteData) {
      this.restaurantClick.emit(biteData);
    }
  }

  private async isGoogleMapsInstalled(): Promise<boolean> {
    const result = await AppLauncher.canOpenUrl({ url: 'comgooglemaps://' });
    return result.value;
  }

  async openNavigation(): Promise<void> {
    const biteData = this.bite();
    if (!biteData?.position) {
      return;
    }

    const { latitude, longitude } = biteData.position;
    const destination = `${latitude},${longitude}`;
    let url: string;
    let target = '_system';

    if (this.platform.is('ios')) {
      try {
        const appleMapsUrl = `maps://?daddr=${destination}`;
        const googleMapsUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
        url = appleMapsUrl;

        const isGoogleMapsInstalled = await this.isGoogleMapsInstalled();
        if (isGoogleMapsInstalled) {
          await this.letUserChooseWhichMapToOpen(
            appleMapsUrl,
            target,
            googleMapsUrl,
          );
          return;
        }
      } catch {
        url = `maps://?daddr=${destination}`;
      }
    } else if (this.platform.is('android')) {
      url = this.buildUrlForAndroidChooser(biteData, destination);
    } else {
      url = this.buildUrlForBrowser(destination);
      target = '_blank';
    }

    window.open(url, target);
  }

  private buildUrlForBrowser(destination: string): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
  }

  private buildUrlForAndroidChooser(
    biteData: Bite,
    destination: string,
  ): string {
    const label = encodeURIComponent(biteData.name || 'Destination');
    return `geo:0,0?q=${destination}(${label})`;
  }

  private async letUserChooseWhichMapToOpen(
    appleMapsUrl: string,
    target: string,
    googleMapsUrl: string,
  ): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Choose Navigation App',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Apple Maps',
          handler: (): void => {
            window.open(appleMapsUrl, target);
          },
        },
        {
          text: 'Google Maps',
          handler: (): void => {
            window.open(googleMapsUrl, target);
          },
        },
      ],
    });

    await alert.present();
  }

  onShareBiteClicked(bite: Bite | undefined): void {
    if (bite) {
      this.shareBite.emit(bite);
    }
  }
}
