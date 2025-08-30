import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonText,
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { ToMetricPipe } from 'distance-pipe';
import { LikesComponent } from './likes/likes.component';
import { Dialog } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WithFirstLetterUpperCasePipe } from './pipes/with-first-letter-upper-case.pipe';
import { ConfirmDialogComponent } from 'bite-tribe-common/confirm-dialog';
import { StarRatingComponent } from 'common/ui/star-rating';

@Component({
  selector: 'bt-bite',
  templateUrl: './bite.component.html',
  styleUrls: ['./bite.component.scss'],
  imports: [
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    ToMetricPipe,
    LikesComponent,
    IonButton,
    IonText,
    WithFirstLetterUpperCasePipe,
    StarRatingComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BiteComponent {
  bite = input.required<Bite>();
  userId = input<string>();
  showEditButton = input(false, { transform: booleanAttribute });

  biteClick = output<Bite>();
  restaurantClick = output<Bite>();
  likeButtonClick = output<{ likeType: string; biteId: string }>();
  gotoEdit = output<Bite>();
  deleteBite = output<Bite>();

  dialog = inject(Dialog);
  private readonly destroyRef = inject(DestroyRef);

  async onDeleteBiteClick(biteData: Bite): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Bite',
        message: 'Are you sure you want to delete this bite?',
        confirmButtonText: 'Yes',
        cancelButtonText: 'No',
      },
    });

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === 'confirm') {
          this.deleteBite.emit(biteData);
        }
      });
  }
}
