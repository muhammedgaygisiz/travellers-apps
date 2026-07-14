import { computed, inject, Injectable, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { AnalyticsEvent, AnalyticsService, AuthService } from 'ta-firestore';

interface FirebaseError {
  code?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ForgotPasswordService {
  private readonly authService = inject(AuthService);
  private readonly analytics = inject(AnalyticsService);
  private readonly navController = inject(NavController);

  private readonly resetRequestedState = signal(false);
  private readonly resetFailedState = signal(false);

  readonly resetRequested = computed(() => this.resetRequestedState());
  readonly resetFailed = computed(() => this.resetFailedState());

  async requestPasswordReset(email: string): Promise<void> {
    this.resetRequestedState.set(false);
    this.resetFailedState.set(false);
    this.analytics.logEvent(AnalyticsEvent.PasswordResetRequested);

    try {
      await this.authService.sendPasswordResetEmail(email);
      this.resetRequestedState.set(true);
    } catch (error: unknown) {
      this.analytics.logEvent(AnalyticsEvent.PasswordResetRequestFailed, {
        code: this.getErrorCode(error),
      });
      this.resetFailedState.set(true);
    }
  }

  async backToLogin(): Promise<void> {
    await this.navController.navigateBack(['/login']);
  }

  private getErrorCode(error: unknown): string {
    if (!this.isFirebaseError(error) || !error.code) {
      return 'unknown';
    }

    return error.code;
  }

  private isFirebaseError(error: unknown): error is FirebaseError {
    return typeof error === 'object' && error !== null;
  }
}
