import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
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
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { Bite, Like } from 'model';
import { LikesComponent } from './likes/likes.component';
import { WithFirstLetterUpperCasePipe } from './pipes/with-first-letter-upper-case.pipe';
import { StarRatingComponent } from 'common/ui/star-rating';
import type { OverlayEventDetail } from '@ionic/core';
import { DistanceComponent } from 'common/distance';
import { GetImagePipe } from './pipes/get-image.pipe';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

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
    IonModal,
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

  bite = input.required<Bite>();
  userId = input<string>();
  showEditButton = input(false, { transform: booleanAttribute });
  hasErrorLoadingGpsPosition = input(false);
  readonly = input(false, { transform: booleanAttribute });

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();
  likeButtonClick = output<Like>();
  gotoEdit = output<Bite>();
  deleteBite = output<Bite>();
  rateNowClick = output<{ bite: Bite; rating: number }>();

  isOpen = signal(false);
  isRatingModalOpen = signal(false);
  selectedRating = signal<number>(0);

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
