import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { PageComponent } from 'common/ui/page';

export interface DeleteMyAccountRequest {
  password?: string;
}

/**
 * Presents the account-deletion contract and collects the confirmation.
 *
 * The contract is shown on the page rather than inside the alert so it stays
 * readable in every locale: the alert only carries the final yes/no.
 */
@Component({
  selector: 'delete-my-account',
  templateUrl: './delete-my-account.component.html',
  styleUrl: './delete-my-account.component.scss',
  imports: [
    PageComponent,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonText,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteMyAccountComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  deleting = input(false);
  failed = input(false);
  passwordRequired = input(false);

  deleteAccount = output<DeleteMyAccountRequest>();
  cancelDelete = output<void>();

  // The backend answers a stale sign-in with `reauth_required`; for an
  // email/password account the only way back is the password, so the prompt is
  // opened as soon as the flow asks for it.
  private readonly passwordPromptEffect = effect(() => {
    if (this.passwordRequired()) {
      void this.promptForPassword();
    }
  });

  async confirmDelete(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('delete-account-confirm-title'),
      message: this.transloco.translate('delete-account-confirm-message'),
      buttons: [
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('delete-account-confirm-delete'),
          role: 'destructive',
          handler: (): void => {
            this.deleteAccount.emit({});
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * Asks for the account password when the backend rejected the sign-in as too
   * old. Only email/password accounts reach this: provider accounts refresh
   * their sign-in through their own sheet.
   */
  async promptForPassword(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('delete-account-reauth-title'),
      message: this.transloco.translate('delete-account-reauth-message'),
      inputs: [
        {
          name: 'password',
          type: 'password',
          placeholder: this.transloco.translate('password'),
        },
      ],
      buttons: [
        {
          text: this.transloco.translate('cancel'),
          role: 'cancel',
        },
        {
          text: this.transloco.translate('delete-account-confirm-delete'),
          role: 'destructive',
          handler: (value: { password?: string }): boolean => {
            if (!value?.password) {
              return false;
            }

            this.deleteAccount.emit({ password: value.password });

            return true;
          },
        },
      ],
    });

    await alert.present();
  }
}
