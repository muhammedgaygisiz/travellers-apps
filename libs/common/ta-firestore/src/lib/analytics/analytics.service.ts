import { Injectable } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { AnalyticsEventName, AnalyticsEventParamMap } from './analytics-events';

/**
 * Typed wrapper around Firebase Analytics for launch-critical product events.
 *
 * Call sites in the integration layer emit events declaratively via
 * {@link AnalyticsService.logEvent}. Tracking never throws and no-ops in the
 * business app, mirroring the analytics guard in `AuthService`.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  logEvent<E extends AnalyticsEventName>(
    event: E,
    ...args: AnalyticsEventParamMap[E] extends never
      ? []
      : [params: AnalyticsEventParamMap[E]]
  ): void {
    if (process.env['NX_APP_BITE_TRIBE_IS_BUSINESS']) {
      return;
    }

    void this.emit(event, args[0] as Record<string, unknown> | undefined);
  }

  private async emit(
    name: string,
    params: Record<string, unknown> | undefined,
  ): Promise<void> {
    try {
      await FirebaseAnalytics.logEvent({ name, params });
    } catch (error) {
      // Analytics is best-effort; never let tracking break a user flow.
      console.warn(`Failed to log analytics event "${name}":`, error);
    }
  }
}
