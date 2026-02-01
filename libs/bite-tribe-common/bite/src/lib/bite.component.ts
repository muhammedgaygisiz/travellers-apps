import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import {
  IonAlert,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { Bite, Like } from 'model';
import { LikesComponent } from './likes/likes.component';
import { WithFirstLetterUpperCasePipe } from './pipes/with-first-letter-upper-case.pipe';
import { StarRatingComponent } from 'common/ui/star-rating';
import type { OverlayEventDetail } from '@ionic/core';
import { DistanceComponent } from 'common/distance';

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
    IonText,
    WithFirstLetterUpperCasePipe,
    StarRatingComponent,
    IonAlert,
    DistanceComponent,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteComponent {
  bite = input.required<Bite>();
  userId = input<string>();
  showEditButton = input(false, { transform: booleanAttribute });
  hasErrorLoadingGpsPosition = input(false);
  isLoading = input(false, { transform: booleanAttribute });

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();
  likeButtonClick = output<Like>();
  gotoEdit = output<Bite>();
  deleteBite = output<Bite>();

  isOpen = signal(false);

  confirmationButtons = [
    {
      text: 'Cancel',
      role: CANCEL,
    },
    {
      text: 'Delete',
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
}
