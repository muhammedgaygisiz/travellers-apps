import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAlert,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Bite, LikeClick } from 'model';
import { LikesComponent } from './likes/likes.component';
import { getLikeCounts, getUserLikeType } from './utils/like-counts';
import { getEffectiveImageStatus } from './utils/image-status';
import { WithFirstLetterUpperCasePipe } from './pipes/with-first-letter-upper-case.pipe';
import { StarRatingComponent } from 'common/ui/star-rating';
import type { OverlayEventDetail } from '@ionic/core';
import { DistanceComponent } from 'common/distance';
import { GetImagePipe } from './pipes/get-image.pipe';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { toSignal } from '@angular/core/rxjs-interop';
import { getLocalizedRegionName } from './utils/getLocalizedCityAndCountry';

const DELETE = 'delete';
const CANCEL = 'cancel';

@Component({
  selector: 'bt-bite',
  templateUrl: 'bite.component.html',
  styleUrls: ['bite.component.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    LikesComponent,
    IonButton,
    IonButtons,
    IonText,
    WithFirstLetterUpperCasePipe,
    StarRatingComponent,
    IonAlert,
    IonIcon,
    IonModal,
    IonSpinner,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    DistanceComponent,
    GetImagePipe,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteComponent {
  private readonly transloco = inject(TranslocoService);
  activeLang = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang?.() || 'en',
  });

  bite = input.required<Bite>();
  userId = input<string>();
  showEditButton = input(false, { transform: booleanAttribute });
  hasErrorLoadingGpsPosition = input(false);
  readonly = input(false, { transform: booleanAttribute });

  biteClick = output<Bite>();
  likeButtonClick = output<LikeClick>();
  gotoEdit = output<Bite>();
  deleteBite = output<Bite>();
  rateNowClick = output<{ bite: Bite; rating: number }>();

  likeCounts = computed(() => getLikeCounts(this.bite()));
  userLikeType = computed(() => getUserLikeType(this.bite(), this.userId()));

  isOpen = signal(false);
  isRatingModalOpen = signal(false);
  selectedRating = signal<number>(0);

  /**
   * Set once the image transitions from a pending upload to uploaded while this
   * card is mounted, so we can fade the photo in instead of hard-cutting from
   * the "uploading" overlay. Scoped to the live transition — images that were
   * already uploaded when the card rendered are not animated.
   */
  readonly imageJustUploaded = signal(false);
  private previousImageStatus: Bite['imageStatus'];

  private readonly trackImageUploadTransition = effect(() => {
    const status = this.bite().imageStatus;

    if (this.previousImageStatus === 'pending' && status === 'uploaded') {
      this.imageJustUploaded.set(true);
    }

    this.previousImageStatus = status;
  });

  /**
   * The stored status, except that a long-abandoned `pending` upload reads as
   * `failed`. Recomputed whenever the Bite changes rather than on a timer, so a
   * card left open past the threshold flips on its next render (a feed refresh,
   * a navigation, or a document update) instead of mid-view.
   */
  protected readonly imageStatus = computed(() =>
    getEffectiveImageStatus(this.bite()),
  );

  /**
   * Only the poster's device is doing the upload, so only the poster can act on
   * it. Everyone else gets a neutral wait message instead of being told to keep
   * their app open for a transfer that is not theirs. See GitHub issue #1168.
   */
  protected readonly pendingImageTextKey = computed((): string => {
    const userId = this.userId();

    return !!userId && this.bite().userId === userId
      ? 'uploading-keep-app-open'
      : 'loading-photo';
  });

  isOwnUnratedBite = computed(() => {
    const bite = this.bite();
    const userId = this.userId();
    return (
      !!userId && bite.userId === userId && (!bite.rating || bite.rating === 0)
    );
  });

  confirmationButtons = [
    {
      text: this.transloco.translate('cancel'),
      role: CANCEL,
    },
    {
      text: this.transloco.translate('delete'),
      role: DELETE,
    },
  ];

  protected readonly biteLocation = computed(() => {
    const bite = this.bite();
    const lang = this.activeLang();

    return getLocalizedRegionName(bite, lang);
  });

  handleConfirmationDismiss(event: CustomEvent<OverlayEventDetail>): void {
    const role = event.detail.role;

    if (role === DELETE) {
      const bite = this.bite();
      this.deleteBite.emit(bite);
    }

    this.isOpen.set(false);
  }

  openConfirmationDialog(): void {
    this.isOpen.set(true);
  }

  openRatingModal(): void {
    this.selectedRating.set(0);
    this.isRatingModalOpen.set(true);
  }

  onRatingChosen(rating: number): void {
    this.selectedRating.set(rating);
  }

  saveRating(modal: IonModal): void {
    const rating = this.selectedRating();
    if (!rating) {
      return;
    }
    this.rateNowClick.emit({ bite: this.bite(), rating });
    void modal.dismiss();
    this.isRatingModalOpen.set(false);
  }

  closeRatingModal(modal: IonModal): void {
    void modal.dismiss();
    this.isRatingModalOpen.set(false);
  }
}
