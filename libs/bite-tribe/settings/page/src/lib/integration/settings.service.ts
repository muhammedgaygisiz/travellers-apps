import { inject, Injectable } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { Settings } from 'model';
import { NavController } from '@ionic/angular';
import {
  EmailVerificationService,
  type EmailVerificationSurface,
} from 'bite-tribe/email-verification-data-access';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  dataAccess = inject(SettingsDataAccessService);
  private readonly navController = inject(NavController);
  private readonly emailVerification = inject(EmailVerificationService);

  user = this.dataAccess.user;
  publicUser = this.dataAccess.publicUser;
  settings = this.dataAccess.settings;
  emailVerificationPromptVisible = this.emailVerification.promptVisible;

  async saveSettings(settings: Settings): Promise<void> {
    await this.dataAccess.saveSettings(settings);

    void this.navController.navigateBack(['home']);
  }

  logout(): void {
    this.dataAccess.logout();
  }

  trackEmailVerificationPromptShown(surface: EmailVerificationSurface): void {
    this.emailVerification.trackPromptShown(surface);
  }

  resendEmailVerification(surface: EmailVerificationSurface): Promise<void> {
    return this.emailVerification.resend(surface);
  }
}
