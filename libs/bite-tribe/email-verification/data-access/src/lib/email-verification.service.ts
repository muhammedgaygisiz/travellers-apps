import { computed, inject, Injectable, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import {
  getEmailVerificationFailureReason,
  isEmailVerificationPromptVisible,
  type EmailVerificationFailureReason,
} from 'utils';

export type EmailVerificationSurface = 'home' | 'settings' | 'profile_edit';

const TOAST_DURATION_MS = 5000;

@Injectable({ providedIn: 'root' })
export class EmailVerificationService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);
  private readonly analytics = inject(AnalyticsService);
  private readonly toastController = inject(ToastController);
  private readonly transloco = inject(TranslocoService);

  private readonly publicUser = toSignal(this.storeService.publicUser$);
  private readonly resendRunningState = signal(false);

  readonly promptVisible = computed(() =>
    isEmailVerificationPromptVisible(this.publicUser()),
  );

  readonly resendRunning = this.resendRunningState.asReadonly();

  trackPromptShown(surface: EmailVerificationSurface): void {
    if (!this.promptVisible()) {
      return;
    }

    this.analytics.logEvent(AnalyticsEvent.EmailVerificationPromptShown, {
      surface,
    });
  }

  async resend(surface: EmailVerificationSurface): Promise<void> {
    // A second tap while the callable is in flight would request another email
    // without the user being able to tell the two results apart.
    if (this.resendRunningState()) {
      return;
    }

    this.resendRunningState.set(true);

    this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendTapped, {
      surface,
    });

    try {
      await this.api.resendEmailVerification();
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendSucceeded, {
        surface,
      });
      await this.showToast('verification-email-sent-check-your-inbox');
    } catch (error) {
      const reason = getEmailVerificationFailureReason(error);
      this.analytics.logEvent(AnalyticsEvent.EmailVerificationResendFailed, {
        surface,
        reason,
      });
      await this.showToast(this.getResendErrorKey(reason));
    } finally {
      // Released on every outcome so a recoverable failure stays retryable.
      this.resendRunningState.set(false);
    }
  }

  private getResendErrorKey(reason: EmailVerificationFailureReason): string {
    switch (reason) {
      case 'rate_limited':
        return 'please-wait-before-requesting-another-verification-email';
      case 'already_verified':
        return 'email-already-verified';
      case 'unsupported_provider':
        return 'email-verification-not-available';
      default:
        return 'verification-email-could-not-be-sent';
    }
  }

  private async showToast(messageKey: string): Promise<void> {
    const toast = await this.toastController.create({
      message: this.transloco.translate(messageKey),
      position: 'bottom',
      duration: TOAST_DURATION_MS,
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
