import { inject, Injectable } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { PublicUser, Settings } from 'model';
import { NavController, ToastController } from '@ionic/angular';
import {
  getEmailVerificationFailureReason,
  type EmailVerificationFailureReason,
} from 'utils';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { TranslocoService } from '@jsverse/transloco';

type EmailVerificationSurface = 'home' | 'settings' | 'profile_edit';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  dataAccess = inject(SettingsDataAccessService);
  private readonly navController = inject(NavController);
  private readonly analytics = inject(AnalyticsService);
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  user = this.dataAccess.user;
  publicUser = this.dataAccess.publicUser;
  settings = this.dataAccess.settings;
  emailVerificationPromptVisible =
    this.dataAccess.emailVerificationPromptVisible;

  async saveSettings(settings: Settings): Promise<void> {
    await this.dataAccess.saveSettings(settings);

    void this.navController.navigateBack(['home']);
  }

  logout(): void {
    this.dataAccess.logout();
  }

  trackEmailVerificationPromptShown(surface: EmailVerificationSurface): void {
    if (!this.emailVerificationPromptVisible()) {
      return;
    }

    this.analytics.logEvent(AnalyticsEvent.EmailVerificationPromptShown, {
      surface,
    });
  }

  async resendEmailVerification(
    surface: EmailVerificationSurface,
  ): Promise<void> {
    this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendTapped, {
      surface,
    });

    try {
      await this.dataAccess.resendEmailVerification();
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendSucceeded, {
        surface,
      });
      await this.showEmailVerificationToast(
        'verification-email-sent-check-your-inbox',
      );
    } catch (error) {
      const reason = getEmailVerificationFailureReason(error);
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendFailed, {
        surface,
        reason,
      });
      await this.showEmailVerificationToast(this.getResendErrorKey(reason));
    }
  }

  private getResendErrorKey(reason: EmailVerificationFailureReason): string {
    if (reason === 'rate_limited') {
      return 'please-wait-before-requesting-another-verification-email';
    }

    return 'verification-email-could-not-be-sent';
  }

  private async showEmailVerificationToast(messageKey: string): Promise<void> {
    const toast = await this.toastController.create({
      message: this.transloco.translate(messageKey),
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
}
