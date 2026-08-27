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
 * Why the last attempt failed, as far as it changes what the page says. A
 * changed session and a refused re-authentication each need their own message,
 * because neither is fixed by repeating the same action; everything else is
 * retryable in place.
 */
export type DeleteMyAccountFailure =
  'account-changed' | 'reauth-failed' | 'generic';

/** The reason reported to analytics when an attempt ends without a deletion. */
type DeleteMyAccountFailureReason =
  'reauth_failed' | 'unknown' | 'account_changed';

const FAILURE_BY_REASON: Record<
  DeleteMyAccountFailureReason,
  DeleteMyAccountFailure
> = {
  reauth_failed: 'reauth-failed',
  unknown: 'generic',
  account_changed: 'account-changed',
};

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
 * account cannot refresh the sign-in on its own. Google and Apple accounts
 * re-authenticate through their own sheet instead, so nothing is collected for
 * them.
 */
export interface ReauthenticationPassword {
  password: string;
}

const GOOGLE_PROVIDER_ID = 'google.com';
const APPLE_PROVIDER_ID = 'apple.com';
const PASSWORD_PROVIDER_ID = 'password';

/**
 * Firebase's own reserved entry, not a sign-in method.
 *
 * The Android SDK returns the `FirebaseUser` itself as the first element of
 * `providerData`, under this id; the web and iOS SDKs list the linked providers
 * only. Reading element zero therefore resolved every Android account to an
 * unknown provider, which is what left account deletion unable to
 * re-authenticate (issue #1385).
 */
const FIREBASE_PROVIDER_ID = 'firebase';

const SIGN_IN_METHOD_BY_PROVIDER_ID: Record<string, AccountSignInMethod> = {
  [GOOGLE_PROVIDER_ID]: 'google',
  [APPLE_PROVIDER_ID]: 'apple',
  [PASSWORD_PROVIDER_ID]: 'password',
};

/** Providers that refresh a sign-in through their own sheet. */
const SHEET_PROVIDER_IDS = new Set([GOOGLE_PROVIDER_ID, APPLE_PROVIDER_ID]);

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
   * Google and Apple accounts never reach this state.
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

    // Only Google and Apple can refresh a sign-in on their own. Every other
    // provider id - including one this app does not know - is answered with the
    // password prompt, because opening a sign-in sheet that does not exist can
    // only fail and would leave the deletion permanently unreachable.
    if (!SHEET_PROVIDER_IDS.has(providerId) && !credentials) {
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

    // Everything that is not a sheet provider re-authenticates with the
    // password, which is also the only answer available to a provider id this
    // app does not recognize.
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

  private onFailed(reason: DeleteMyAccountFailureReason): boolean {
    this.analytics.logEvent(AnalyticsEvent.AccountDeletionFailed, { reason });
    this.failure.set(FAILURE_BY_REASON[reason]);
    this.state.set('failed');

    return false;
  }

  reset(): void {
    this.state.set('idle');
    this.failure.set(null);
    this.passwordRequired.set(false);
  }
}

/**
 * The provider the account actually signs in with, skipping Firebase's own
 * reserved entry. Falls back to email/password, the only method that can be
 * re-authenticated without knowing the provider.
 */
const getProviderId = (user: User): string =>
  user.providerData?.find(
    ({ providerId }) => providerId && providerId !== FIREBASE_PROVIDER_ID,
  )?.providerId ?? PASSWORD_PROVIDER_ID;

const toSignInMethod = (user: User): AccountSignInMethod =>
  SIGN_IN_METHOD_BY_PROVIDER_ID[getProviderId(user)] ?? 'unknown';
