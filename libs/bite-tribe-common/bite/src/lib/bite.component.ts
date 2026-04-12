import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  inject,
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
  IonText,
} from '@ionic/angular/standalone';
import { Bite, Like, UploadParams } from 'model';
import { LikesComponent } from './likes/likes.component';
import { WithFirstLetterUpperCasePipe } from './pipes/with-first-letter-upper-case.pipe';
import { StarRatingComponent } from 'common/ui/star-rating';
import type { OverlayEventDetail } from '@ionic/core';
import { DistanceComponent } from 'common/distance';
import { GetImagePipe } from './pipes/get-image.pipe';
import { AsyncPipe } from '@angular/common';
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
    IonText,
    WithFirstLetterUpperCasePipe,
    StarRatingComponent,
    IonAlert,
    DistanceComponent,
    GetImagePipe,
    AsyncPipe,
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
  uploadState = input<{ progress: UploadParams }>();
  readonly = input(false, { transform: booleanAttribute });

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();
  likeButtonClick = output<Like>();
  gotoEdit = output<Bite>();
  deleteBite = output<Bite>();

  isOpen = signal(false);

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
}
