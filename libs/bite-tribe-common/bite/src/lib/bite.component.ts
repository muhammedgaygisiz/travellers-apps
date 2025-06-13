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
} from '@ionic/angular/standalone';
import { Bite } from 'model';
import { ToMetricPipe } from 'distance-pipe';
import { LikesComponent } from './likes/likes.component';
import { ToBlobUrlPipe } from 'image-compression';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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
    ToBlobUrlPipe,
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
          return;
        }

        return;
      });
  }
}

@Component({
  template: `
    <div class="confirmation-dialog ion-padding">
      <h2>Are you sure you want to delete this bite?</h2>

      <div class="confirmation-dialog-actions">
        <ion-button (click)="onConfirm()"> Yes </ion-button>
        <ion-button (click)="onCancel()"> No </ion-button>
      </div>
    </div>
  `,
  imports: [IonButton],
  styles: `
    .confirmation-dialog {
      width: min(274px, 480px);
      height: 220px;
      border: 3px solid var(--ion-color-primary);
      background-color: var(--ion-card-background);
      border-radius: 8px;

      .confirmation-dialog-actions {
        display: flex;
        flex-direction: row;
        align-items: center;

        width: 100%;
        margin-top: 32px;

        > ion-button {
          flex: 1;
          margin: 0 4px;
        }
      }
    }
  `,
})
class ConfirmDialogComponent {
  dialogRef = inject(DialogRef<string>);

  onConfirm() {
    this.dialogRef.close('confirm');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
