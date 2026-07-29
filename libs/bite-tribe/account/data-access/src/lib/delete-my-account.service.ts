import { inject, Injectable, signal } from '@angular/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { getAccountDeletionFailureReason } from 'utils';

export type DeleteMyAccountState = 'idle' | 'deleting' | 'failed';

/**
 * Credentials the flow asks for when the signed-in session is too old and the
 * account uses email/password. Provider accounts re-authenticate through their
 * own sign-in sheet instead, so nothing is collected for them.
 */
export interface ReauthenticationPassword {
  password: string;
}

const GOOGLE_PROVIDER_ID = 'google.com';
const APPLE_PROVIDER_ID = 'apple.com';
const PASSWORD_PROVIDER_ID = 'password';

@Injectable({ providedIn: 'root' })
export class DeleteMyAccountService {
  private readonly api = inject(BiteTribeApiService);
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);

  readonly state = signal<DeleteMyAccountState>('idle');

  /**
   * True while the flow needs the account password to refresh the sign-in.
   * Provider accounts never reach this state.
   */
  readonly passwordRequired = signal(false);

  /**
   * Deletes the account, refreshing the sign-in first when the backend reports
   * it as too old.
   *
   * The backend only accepts a sign-in younger than a few minutes, so a stale
   * session is answered by re-running the account's own sign-in method and
   * retrying once — not by treating it as an error.
   */
  async deleteAccount(
    credentials?: ReauthenticationPassword,
  ): Promise<boolean> {
    this.state.set('deleting');
    this.passwordRequired.set(false);
    this.analytics.logEvent(AnalyticsEvent.AccountDeletionStarted);

    try {
      await this.api.deleteOwnAccount();

      return this.onDeleted();
    } catch (error) {
      if (getAccountDeletionFailureReason(error) !== 'reauth-required') {
        return this.onFailed('unknown');
      }

      return this.reauthenticateAndRetry(credentials);
    }
  }

  private async reauthenticateAndRetry(
    credentials?: ReauthenticationPassword,
  ): Promise<boolean> {
    const providerId = await this.getProviderId();

    if (providerId === PASSWORD_PROVIDER_ID && !credentials) {
      // The page collects the password and calls back into `deleteAccount`.
      this.passwordRequired.set(true);
      this.state.set('idle');
      this.analytics.logEvent(AnalyticsEvent.AccountDeletionFailed, {
        reason: 'reauth_required',
      });

      return false;
    }

    try {
      await this.reauthenticate(providerId, credentials);
    } catch {
      return this.onFailed('reauth_failed');
    }

    try {
      await this.api.deleteOwnAccount();

      return this.onDeleted();
    } catch {
      return this.onFailed('unknown');
    }
  }

  private async reauthenticate(
    providerId: string,
    credentials?: ReauthenticationPassword,
  ): Promise<void> {
    if (providerId === GOOGLE_PROVIDER_ID) {
      await this.authService.signInWithGoogleAccount();

      return;
    }

    if (providerId === APPLE_PROVIDER_ID) {
      await this.authService.signInWithAppleAccount();

      return;
    }

    const email = this.authService.getUser()?.email;

    if (!email || !credentials) {
      throw new Error('missing_password_credentials');
    }

    await this.authService.loginWithUsernameAndPassword({
      email,
      password: credentials.password,
    });
  }

  private async getProviderId(): Promise<string> {
    const { user } = await FirebaseAuthentication.getCurrentUser();

    return user?.providerData?.[0]?.providerId ?? PASSWORD_PROVIDER_ID;
  }

  /**
   * Signs the now-deleted user out. `logout` also clears the Firestore
   * listeners and navigates away, which is what the user should land on once
   * the account no longer exists.
   */
  private async onDeleted(): Promise<boolean> {
    this.analytics.logEvent(AnalyticsEvent.AccountDeletionCompleted);
    this.state.set('idle');

    await this.authService.logout();

    return true;
  }

  private onFailed(
    reason: 'reauth_required' | 'reauth_failed' | 'unknown',
  ): boolean {
    this.analytics.logEvent(AnalyticsEvent.AccountDeletionFailed, { reason });
    this.state.set('failed');

    return false;
  }

  reset(): void {
    this.state.set('idle');
    this.passwordRequired.set(false);
  }
}
