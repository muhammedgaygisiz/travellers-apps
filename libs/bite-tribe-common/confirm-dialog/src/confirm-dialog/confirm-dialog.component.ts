import { Component, inject } from '@angular/core';
import { IonButton, IonText } from '@ionic/angular/standalone';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';

@Component({
  template: `
    <div class="confirmation-dialog ion-padding">
      <h2>{{ data.title }}</h2>

      @if (data.message) {
      <ion-text>{{ data.message }}</ion-text>
      }

      <div class="confirmation-dialog-actions">
        <ion-button (click)="onConfirm()">
          {{ data.confirmButtonText }}
        </ion-button>
        <ion-button (click)="onCancel()">
          {{ data.cancelButtonText }}
        </ion-button>
      </div>
    </div>
  `,
  imports: [IonButton, IonText],
  styles: `
    .confirmation-dialog {
      width: min(274px, 480px);
      height: fit-content;
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
  data: {
    title: string;
    message: string;
    confirmButtonText: string;
    cancelButtonText: string;
  } = inject(DIALOG_DATA);

  onConfirm() {
    this.dialogRef.close('confirm');
  }

  onCancel() {
    this.dialogRef.close('cancel');
  }
}
