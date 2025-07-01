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
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { WithFirstLetterUpperCasePipe } from './pipes/with-first-letter-upper-case.pipe';

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// eslint-disable-next-line @angular-eslint/component-class-suffix
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

  async onDeleteBiteClick(biteData: Bite) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent);

    dialogRef.closed
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result === 'confirm') {
          this.deleteBite.emit(biteData);
        }
      });
  }
}
