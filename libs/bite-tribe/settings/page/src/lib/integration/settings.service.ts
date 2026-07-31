import { inject, Injectable, signal } from '@angular/core';
import { SettingsDataAccessService } from 'bite-tribe/settings-data-access';
import { Settings } from 'model';
import { NavController } from '@ionic/angular';
import {
  EmailVerificationService,
  type EmailVerificationSurface,
} from 'bite-tribe/email-verification-data-access';
import { PATH } from 'utils';
import type { PushInstallation, PushPermissionState } from 'push-notifications';
import type { PushInstallationView } from '../components/page/settings.component';

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

  readonly pushInstallations = signal<readonly PushInstallationView[]>([]);
  readonly pushPermission = signal<PushPermissionState>('prompt');
  readonly pushInstallationsLoading = signal(false);
  readonly pushSetupRunning = signal(false);

  async saveSettings(settings: Settings): Promise<void> {
    await this.dataAccess.saveSettings(settings);

    void this.navController.navigateBack(['home']);
  }

  /**
   * Reloads the registered installations and this device's OS permission.
   *
   * Both are read together because the page shows them as two independent
   * reasons delivery can be off, and a stale pair would make one contradict the
   * other (issue #1184).
   */
  async refreshPushInstallations(): Promise<void> {
    this.pushInstallationsLoading.set(true);

    try {
      const [installations, installationId, permission] = await Promise.all([
        this.dataAccess.loadPushInstallations(),
        this.dataAccess.readInstallationId(),
        this.dataAccess.getPushPermissionState(),
      ]);

      this.pushPermission.set(permission);
      this.pushInstallations.set(
        installations.map((installation) =>
          this.toInstallationView(installation, installationId),
        ),
      );
    } finally {
      this.pushInstallationsLoading.set(false);
    }
  }

  /**
   * Flips one installation's delivery switch and reflects it locally.
   *
   * The row is updated from the write rather than from a reload so the switch
   * does not visibly bounce back while Firestore catches up. A failed write
   * restores the previous state instead of leaving a switch that lies.
   */
  async setPushInstallationEnabled(
    token: string,
    enabled: boolean,
  ): Promise<void> {
    const previous = this.pushInstallations();
    this.applyEnabled(token, enabled);

    try {
      await this.dataAccess.setPushInstallationEnabled(token, enabled);
    } catch (error) {
      console.warn(
        'Failed to change push delivery for an installation:',
        error,
      );
      this.pushInstallations.set(previous);
    }
  }

  /**
   * Registers this device after the contextual permission flow.
   *
   * The list is reloaded on success so the setup action is replaced by the new
   * installation's row; a denial only refreshes the permission state, which
   * turns the action into the device-settings recovery.
   */
  async enablePushOnThisDevice(): Promise<void> {
    if (this.pushSetupRunning()) {
      return;
    }

    this.pushSetupRunning.set(true);

    try {
      const result = await this.dataAccess.enablePushOnThisDevice();

      if (result === 'granted') {
        await this.refreshPushInstallations();

        return;
      }

      this.pushPermission.set(
        result === 'unsupported' ? 'unsupported' : 'denied',
      );
    } finally {
      this.pushSetupRunning.set(false);
    }
  }

  openPushSettings(): Promise<boolean> {
    return this.dataAccess.openPushSettings();
  }

  private applyEnabled(token: string, enabled: boolean): void {
    this.pushInstallations.update((installations) =>
      installations.map((installation) =>
        installation.token === token
          ? { ...installation, enabled }
          : installation,
      ),
    );
  }

  /**
   * Turns a token document into a row the user can recognise.
   *
   * A token registered before installation metadata existed has no label; the
   * page falls back to a translated "Unknown device" rather than showing the
   * raw FCM token, and the row stays manageable until that installation
   * registers again.
   */
  private toInstallationView(
    installation: PushInstallation,
    currentInstallationId: string | undefined,
  ): PushInstallationView {
    const details = [
      this.toOsLabel(installation),
      installation.appVersion ?? '',
    ]
      .filter((detail) => !!detail)
      .join(' · ');

    return {
      token: installation.token,
      label: installation.deviceLabel ?? '',
      details,
      enabled: installation.enabled,
      // Both ids being absent is not a match: a legacy token carries no
      // installation id, and neither does a surface that never registered one,
      // so a bare equality check would label that token "This device".
      isCurrentDevice:
        !!currentInstallationId &&
        installation.installationId === currentInstallationId,
    };
  }

  /**
   * Platform and OS version as one line, e.g. `iOS 26.5`.
   *
   * Platform names are product names, not user-facing copy, so they are not
   * translated. A legacy token with neither value contributes nothing.
   */
  private toOsLabel(installation: PushInstallation): string {
    const platformNames: Record<string, string> = {
      ios: 'iOS',
      android: 'Android',
      web: 'Web',
    };
    const platform = installation.platform
      ? (platformNames[installation.platform] ?? installation.platform)
      : '';

    return [platform, installation.osVersion ?? ''].filter(Boolean).join(' ');
  }

  logout(): void {
    this.dataAccess.logout();
  }

  goToDeleteAccount(): void {
    void this.navController.navigateForward([PATH.DELETE_ACCOUNT]);
  }

  trackEmailVerificationPromptShown(surface: EmailVerificationSurface): void {
    this.emailVerification.trackPromptShown(surface);
  }

  resendEmailVerification(surface: EmailVerificationSurface): Promise<void> {
    return this.emailVerification.resend(surface);
  }
}
