import { inject, Injectable, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Credentials } from '../../api/credentials.model';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';
import {
  LoadingController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { AuthErrorCodes } from 'firebase/auth';

interface RegistrationError {
  code?: string;
  errorMessage?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RegistrationService {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly transloco = inject(TranslocoService);
  readonly toastController = inject(ToastController);
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
    const loading = await this.loadingController.create({
      message: this.transloco.translate('registration-in-progress'),
      backdropDismiss: false,
    });
    await loading.present();

    try {
      await this.authService.registerWithUsernameAndPassword({
        email: registration.email,
        password: registration.password,
      });

      this.analytics.logEvent(AnalyticsEvent.SignUp, { method: 'password' });

      await this.authService.sendEmailVerification();

      await this.showRegistrationSuccessMessage(
        this.transloco.translate(
          'registration-success-check-your-email-to-verify-account',
        ),
      );

      // Awaited so the loading overlay survives the onboarding gate that
      // intercepts this navigation.
      await this.navController.navigateBack(['/home']);
    } catch (error: unknown) {
      if (this.getErrorCode(error) === AuthErrorCodes.EMAIL_EXISTS) {
        // Prevent user enumeration by showing a generic error message
        await this.showRegistrationErrorMessage(
          this.transloco.translate('registration-error-try-again'),
        );

        return;
      }

      await this.showRegistrationErrorMessage(
        this.getErrorMessage(error) ??
          this.transloco.translate('registration-unknown-error-try-again'),
      );
    } finally {
      await loading.dismiss();
      this.registrationInProgress.set(false);
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

  private async showRegistrationSuccessMessage(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      position: 'bottom',
      duration: 5000,
      buttons: [
        {
          text: this.transloco.translate('ok'),
          role: 'confirm',
        },
      ],
    });

    await toast.present();
  }

  private async showRegistrationErrorMessage(message: string): Promise<void> {
    const toast = await this.toastController.create({
      message,
      position: 'bottom',
      buttons: [
        {
          text: this.transloco.translate('ok'),
          role: 'confirm',
        },
      ],
    });

    await toast.present();
  }
}
