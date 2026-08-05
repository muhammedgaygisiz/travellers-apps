import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FirebaseAuthentication,
  type User,
} from '@capacitor-firebase/authentication';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { getAccountDeletionFailureReason } from 'utils';

export type DeleteMyAccountState = 'idle' | 'deleting' | 'failed';

/**
 * Why the last attempt failed, as far as it changes what the page says. Only a
 * changed session needs its own message: everything else is retryable in place.
 */
export type DeleteMyAccountFailure = 'account-changed' | 'generic';

/** How the signed-in account authenticates, named for the UI. */
export type AccountSignInMethod = 'password' | 'google' | 'apple' | 'unknown';

/**
 * The non-secret identity of the account a deletion would target.
 *
 * It exists so the destructive page can name the account before the point of
 * no return; `uid` is what the deletion itself is checked against, the rest is
 * only shown.
 */
export interface DeleteAccountIdentity {
  uid: string;
  displayName: string;
  email: string;
  photoUrl: string;
  signInMethod: AccountSignInMethod;
}

/**
 * A deletion of the account the user was shown and confirmed.
 *
 * `confirmedUid` is carried through deliberately: the page can only confirm the
 * account it displayed, so the deletion refuses to run against any other.
 */
export interface DeleteMyAccountCommand {
  confirmedUid: string;
  password?: string;
}

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

const SIGN_IN_METHOD_BY_PROVIDER_ID: Record<string, AccountSignInMethod> = {
  [GOOGLE_PROVIDER_ID]: 'google',
  [APPLE_PROVIDER_ID]: 'apple',
  [PASSWORD_PROVIDER_ID]: 'password',
};

@Injectable({ providedIn: 'root' })
export class DeleteMyAccountService {
  private readonly api = inject(BiteTribeApiService);
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly storeService = inject(BiteTribeStoreService);

  private readonly profile = toSignal(this.storeService.publicUser$);

  readonly state = signal<DeleteMyAccountState>('idle');

  readonly failure = signal<DeleteMyAccountFailure | null>(null);

  /**
   * True while the flow needs the account password to refresh the sign-in.
   * Provider accounts never reach this state.
   */
  readonly passwordRequired = signal(false);

  /**
   * The account a deletion would target right now.
   *
   * It follows the auth session rather than a value read once when the page
   * opened, so a session that changes underneath the page - a sign-out, a
   * different account, a resume from background - changes what is shown
   * instead of leaving stale identity in front of a destructive action.
   *
   * The profile document carries the name and photo the user recognizes; the
   * auth user carries the identity the deletion runs against, and is the only
   * source trusted for `uid`, `email` and the sign-in method.
   */
  readonly identity = computed<DeleteAccountIdentity | null>(() => {
    const user = this.authService.getUser();

    if (!user?.uid) {
      return null;
    }

    // A profile left over from a previous session belongs to a different
    // account and must not describe this one.
    const profile =
      this.profile()?.userId === user.uid ? this.profile() : undefined;

    return {
      uid: user.uid,
      displayName: profile?.displayName || user.displayName || '',
      email: user.email || profile?.email || '',
      photoUrl: profile?.photoUrl || user.photoUrl || '',
      signInMethod: toSignInMethod(user),
    };
  });

  /**
   * Deletes the account the user confirmed, refreshing the sign-in first when
   * the backend reports it as too old.
   *
   * The backend only accepts a sign-in younger than a few minutes, so a stale
   * session is answered by re-running the account's own sign-in method and
   * retrying once — not by treating it as an error.
   *
   * The signed-in account is read again here rather than taken from the page:
   * between the confirmation and this call the session may have changed, and a
   * deletion may only ever run against the account that was actually shown.
   */
  async deleteAccount(command: DeleteMyAccountCommand): Promise<boolean> {
    const user = await this.getCurrentUser();

    if (!user?.uid || user.uid !== command.confirmedUid) {
      return this.onFailed('account_changed');
    }

    this.state.set('deleting');
    this.failure.set(null);
    this.passwordRequired.set(false);
    this.analytics.logEvent(AnalyticsEvent.AccountDeletionStarted);

    const credentials = command.password
      ? { password: command.password }
      : undefined;

    try {
      await this.api.deleteOwnAccount();

      return this.onDeleted();
    } catch (error) {
      if (getAccountDeletionFailureReason(error) !== 'reauth-required') {
        return this.onFailed('unknown');
      }

      return this.reauthenticateAndRetry(user, credentials);
    }
  }

  private async reauthenticateAndRetry(
    user: User,
    credentials?: ReauthenticationPassword,
  ): Promise<boolean> {
    const providerId = getProviderId(user);

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

    // A provider sheet lets the user pick an account, so a successful sign-in
    // does not prove it is still the same one. Deleting whatever is signed in
    // now would delete an account the user never confirmed.
    const reauthenticated = await this.getCurrentUser();

    if (reauthenticated?.uid !== user.uid) {
      return this.onFailed('account_changed');
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

  private async getCurrentUser(): Promise<User | null> {
    try {
      const { user } = await FirebaseAuthentication.getCurrentUser();

      return user;
    } catch {
      return null;
    }
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
    reason: 'reauth_required' | 'reauth_failed' | 'unknown' | 'account_changed',
  ): boolean {
    this.analytics.logEvent(AnalyticsEvent.AccountDeletionFailed, { reason });
    this.failure.set(
      reason === 'account_changed' ? 'account-changed' : 'generic',
    );
    this.state.set('failed');

    return false;
  }

  reset(): void {
    this.state.set('idle');
    this.failure.set(null);
    this.passwordRequired.set(false);
  }
}

const getProviderId = (user: User): string =>
  user.providerData?.[0]?.providerId ?? PASSWORD_PROVIDER_ID;

const toSignInMethod = (user: User): AccountSignInMethod =>
  SIGN_IN_METHOD_BY_PROVIDER_ID[getProviderId(user)] ?? 'unknown';
