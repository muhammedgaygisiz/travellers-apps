import {
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
  IonAvatar,
  IonButton,
  IonContent,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { AlertController } from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type {
  AccountSignInMethod,
  DeleteAccountIdentity,
  DeleteMyAccountFailure,
} from 'bite-tribe/account-data-access';
import { PageComponent } from 'common/ui/page';

export interface DeleteMyAccountRequest {
  /** The account the page displayed and the user confirmed. */
  uid: string;
  password?: string;
}

const SIGN_IN_METHOD_KEYS: Record<AccountSignInMethod, string> = {
  password: 'delete-account-identity-method-password',
  google: 'delete-account-identity-method-google',
  apple: 'delete-account-identity-method-apple',
  unknown: 'delete-account-identity-method-unknown',
};

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
    IonAvatar,
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
  failure = input<DeleteMyAccountFailure | null>(null);
  passwordRequired = input(false);

  /**
   * The account this page would delete. `null` while no account is signed in,
   * which is the one state the page must not offer a deletion in.
   */
  identity = input<DeleteAccountIdentity | null>(null);

  deleteAccount = output<DeleteMyAccountRequest>();
  cancelDelete = output<void>();

  /**
   * The photo URL that failed to load, if any. Kept as the URL rather than a
   * flag so a later account with a working photo is not hidden by the previous
   * account's broken one.
   */
  private readonly failedPhotoUrl = signal('');

  readonly avatarUrl = computed((): string => {
    const photoUrl = this.identity()?.photoUrl ?? '';

    return photoUrl === this.failedPhotoUrl() ? '' : photoUrl;
  });

  readonly signInMethodKey = computed((): string => {
    const identity = this.identity();

    return identity ? SIGN_IN_METHOD_KEYS[identity.signInMethod] : '';
  });

  readonly failureKey = computed((): string =>
    this.failure() === 'account-changed'
      ? 'delete-account-account-changed'
      : 'delete-account-failed',
  );

  onPhotoError(): void {
    this.failedPhotoUrl.set(this.identity()?.photoUrl ?? '');
  }

  // The backend answers a stale sign-in with `reauth_required`; for an
  // email/password account the only way back is the password, so the prompt is
  // opened as soon as the flow asks for it.
  private readonly passwordPromptEffect = effect(() => {
    if (this.passwordRequired()) {
      void this.promptForPassword();
    }
  });

  async confirmDelete(): Promise<void> {
    const identity = this.identity();

    if (!identity) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.transloco.translate('delete-account-confirm-title'),
      // The alert is the point of no return, so it repeats the account instead
      // of trusting that the card behind it is still the one being read.
      subHeader: this.describeIdentity(identity),
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
            this.deleteAccount.emit({ uid: identity.uid });
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
    const identity = this.identity();

    if (!identity) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.transloco.translate('delete-account-reauth-title'),
      subHeader: this.describeIdentity(identity),
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

            this.deleteAccount.emit({
              uid: identity.uid,
              password: value.password,
            });

            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * One line that tells this account apart from another one on the same device.
   *
   * The email is the strongest distinguishing identifier the app has, and the
   * sign-in method stands in for it when a provider withholds it — never a
   * secret, and never the raw uid, which means nothing to the user.
   */
  private describeIdentity(identity: DeleteAccountIdentity): string {
    const name =
      identity.displayName || this.transloco.translate('no-display-name');
    const detail =
      identity.email ||
      this.transloco.translate(SIGN_IN_METHOD_KEYS[identity.signInMethod]);

    return `${name} · ${detail}`;
  }
}
