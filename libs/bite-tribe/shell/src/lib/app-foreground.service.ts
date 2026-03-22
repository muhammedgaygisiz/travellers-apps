import { inject, Injectable } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';

export const FOREGROUND_REFRESH_THRESHOLD_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AppForegroundService {
  private readonly storeService = inject(BiteTribeStoreService);
  private lastBackgroundTimestamp: number | null = null;

  handleAppStateChange(isActive: boolean): void {
    if (isActive) {
      this.triggerRefreshIfNeeded();
    } else {
      this.lastBackgroundTimestamp = Date.now();
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
    }
  }
}
