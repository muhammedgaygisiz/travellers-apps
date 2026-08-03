import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { AuthService } from 'ta-firestore';
import { NavController } from '@ionic/angular';
import { Network } from '@capacitor/network';

export const FOREGROUND_REFRESH_THRESHOLD_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AppForegroundService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly authService = inject(AuthService);
  private readonly navController = inject(NavController);
  private lastBackgroundTimestamp: number | null = null;

  private readonly isAuthenticated = toSignal(
    this.storeService.isAuthenticated$,
    { initialValue: false },
  );

  private readonly hasErrorLoadingGpsPosition = toSignal(
    this.storeService.hasErrorLoadingGpsPosition$,
    { initialValue: false },
  );

  handleAppStateChange(isActive: boolean): void {
    if (isActive) {
      this.updateUserMetadata();

      this.retryBlockedGpsPosition();

      this.triggerRefreshIfNeeded();
    } else {
      this.lastBackgroundTimestamp = Date.now();
    }
  }

  /**
   * Re-reads the position as soon as the app comes back with a location error
   * still on screen, no matter how briefly it was away.
   *
   * The only way out of a denied location permission is the system settings
   * page, and that round trip is fast — well under
   * {@link FOREGROUND_REFRESH_THRESHOLD_MS}. Leaving the recovery to the
   * inactivity threshold meant a user who granted access and came straight
   * back still saw the error until they refreshed by hand (issue #1183).
   */
  private retryBlockedGpsPosition(): void {
    if (this.lastBackgroundTimestamp === null) {
      return;
    }

    if (this.hasErrorLoadingGpsPosition()) {
      this.storeService.reloadGPSPosition();
    }
  }

  private triggerRefreshIfNeeded(): void {
    if (this.lastBackgroundTimestamp === null) {
      return;
    }

    const inactiveDuration = Date.now() - this.lastBackgroundTimestamp;

    if (inactiveDuration > FOREGROUND_REFRESH_THRESHOLD_MS) {
      this.lastBackgroundTimestamp = null;
      this.storeService.reloadGPSPosition();
      void this.refreshSession();
    }
  }

  /**
   * Repairs a session that may have gone stale while the app was backgrounded
   * (long inactivity, or a relaunch after an app update) so subsequent writes —
   * notably Bite image uploads — don't fail with `storage/unauthenticated`.
   * No-ops when signed out or offline; routes to re-auth when the session is
   * no longer valid.
   */
  private async refreshSession(): Promise<void> {
    if (!this.isAuthenticated()) {
      return;
    }

    const { connected } = await Network.getStatus();
    if (!connected) {
      return;
    }

    const refreshed = await this.authService.refreshSession();
    if (!refreshed) {
      void this.navController.navigateRoot('/start');
    }
  }

  private updateUserMetadata(): void {
    if (this.isAuthenticated()) {
      this.storeService.updateUserMetadata();
      this.storeService.syncEmailVerificationStatus();
    }
  }
}
