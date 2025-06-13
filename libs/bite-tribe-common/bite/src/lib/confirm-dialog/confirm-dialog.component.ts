import { Component, inject } from '@angular/core';
import { IonButton } from '@ionic/angular/standalone';
import { DialogRef } from '@angular/cdk/dialog';

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
export class ConfirmDialogComponent {
  dialogRef = inject(DialogRef<string>);

  onConfirm() {
    this.dialogRef.close('confirm');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
