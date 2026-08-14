import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Credentials } from '../../api/credentials.model';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import { LoadingController, NavController } from '@ionic/angular/standalone';
import { AuthErrorCodes } from 'firebase/auth';
import { ToastService } from 'toast';

interface RegistrationError {
  code?: string;
  errorMessage?: string;
}

/**
 * Upper bound for the loading overlay. It is progress decoration on top of the
 * `registering` signal, so registration must never wait on it (issue #1219).
 * The toasts carry the same guarantee inside `ToastService`.
 */
const OVERLAY_TIMEOUT_MS = 2_000;

/**
 * Upper bound for the registration round-trips. Auth, App Check and the
 * onboarding gate all sit behind the network, and a request that never settles
 * must still release the form (issue #1219).
 */
const REGISTRATION_TIMEOUT_MS = 30_000;

/** Marker for a round-trip that never settled, so it maps to its own message. */
const REGISTRATION_TIMEOUT_CODE = 'registration/timeout';

/**
 * Rejects with `REGISTRATION_TIMEOUT_CODE` when `operation` outlives `timeoutMs`.
 * The timer is always cleared so a settled operation cannot keep the app awake.
 */
const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  // A rejection that lands after the race was lost still needs a handler.
  operation.catch(() => undefined);

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject({ code: REGISTRATION_TIMEOUT_CODE }),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
};

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);
  readonly loadingController = inject(LoadingController);
  readonly navController = inject(NavController);

  private readonly registrationInProgress = signal(false);

  /** Whether a registration round-trip is still running (issue #1185). */
  readonly registering = this.registrationInProgress.asReadonly();

  public async register(registration: Credentials): Promise<void> {
    // Guards against a second submit while the first one is still in flight.
    if (this.registrationInProgress()) {
      return;
    }
    this.registrationInProgress.set(true);

    // Presented before the first network call so the tap is acknowledged
    // immediately, and kept up until onboarding is on screen: sign-up,
    // verification mail, and the onboarding gate are three round-trips that
    // otherwise leave the form looking untouched (issue #1185).
    const loading = await this.presentLoading();

    try {
      await withTimeout(
        this.authService.registerWithUsernameAndPassword({
          email: registration.email,
          password: registration.password,
        }),
        REGISTRATION_TIMEOUT_MS,
      );

      this.analytics.logEvent(AnalyticsEvent.SignUp, { method: 'password' });

      // The verification mail comes from the Firebase email templates, which
      // only speak the language the auth instance was given. The active
      // Transloco language is what the user is reading the form in, so it is
      // the language the mail has to arrive in (issue #1264).
      await withTimeout(
        this.authService.sendEmailVerification(this.transloco.getActiveLang()),
        REGISTRATION_TIMEOUT_MS,
      );

      await this.toast.present({
        messageKey: 'registration-success-check-your-email-to-verify-account',
        outcome: 'success',
      });

      // Awaited so the loading overlay survives the onboarding gate that
      // intercepts this navigation.
      await withTimeout(
        Promise.resolve(this.navController.navigateBack(['/home'])),
        REGISTRATION_TIMEOUT_MS,
      );
    } catch (error: unknown) {
      const code = this.getErrorCode(error);

      if (code === REGISTRATION_TIMEOUT_CODE) {
        // The account may or may not exist by now, so the copy has to point at
        // both a retry and signing in (issue #1219).
        await this.toast.present({
          messageKey: 'registration-timeout-try-again',
          outcome: 'failure',
        });

        return;
      }

      if (code === AuthErrorCodes.EMAIL_EXISTS) {
        // Prevent user enumeration by showing a generic error message
        await this.toast.present({
          messageKey: 'registration-error-try-again',
          outcome: 'failure',
        });

        return;
      }

      // Firebase's own message, when it carries one, is not a translation key,
      // so it is passed through as resolved text.
      const message = this.getErrorMessage(error);

      await this.toast.present(
        message
          ? { message, outcome: 'failure' }
          : {
              messageKey: 'registration-unknown-error-try-again',
              outcome: 'failure',
            },
      );
    } finally {
      await this.dismissLoading(loading);
      this.registrationInProgress.set(false);
    }
  }

  /**
   * Best-effort loading overlay. Returns `null` when it cannot be shown so the
   * form still releases: the `registering` signal is what actually blocks the
   * UI, the overlay only makes the wait legible.
   */
  private async presentLoading(): Promise<HTMLIonLoadingElement | null> {
    try {
      const loading = await withTimeout(
        this.loadingController.create({
          message: this.transloco.translate('registration-in-progress'),
          backdropDismiss: false,
        }),
        OVERLAY_TIMEOUT_MS,
      );
      await withTimeout(loading.present(), OVERLAY_TIMEOUT_MS);

      return loading;
    } catch {
      return null;
    }
  }

  private async dismissLoading(
    loading: HTMLIonLoadingElement | null,
  ): Promise<void> {
    if (!loading) {
      return;
    }

    try {
      await withTimeout(loading.dismiss(), OVERLAY_TIMEOUT_MS);
    } catch {
      // A stuck overlay must not keep `registering` true.
    }
  }

  private getErrorCode(error: unknown): string | undefined {
    if (!this.isRegistrationError(error)) {
      return undefined;
    }

    return error.code;
  }

  private getErrorMessage(error: unknown): string | undefined {
    if (!this.isRegistrationError(error)) {
      return undefined;
    }

    return error.errorMessage;
  }

  private isRegistrationError(error: unknown): error is RegistrationError {
    return typeof error === 'object' && error !== null;
  }
}
