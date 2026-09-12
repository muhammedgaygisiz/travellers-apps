import { Injectable } from '@angular/core';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import {
  ANALYTICS_EVENT_SURFACE,
  ANALYTICS_SURFACE_USER_PROPERTY,
  AnalyticsEventName,
  AnalyticsEventParamMap,
  AnalyticsSurface,
} from './analytics-events';

/**
 * Which app this bundle is.
 *
 * Read from the flag `env-var-plugin.js` compiles into the business bundle, for
 * the reason it exists: the flag identifies the bundle rather than the
 * deployment, so it is the one thing available before any injector exists. The
 * admin app carries no flag of its own and therefore reads as `consumer`,
 * which is what it already was - nothing in it emits a product event.
 */
export const currentAnalyticsSurface = (): AnalyticsSurface =>
  process.env['NX_APP_BITE_TRIBE_IS_BUSINESS'] ? 'business' : 'consumer';

/**
 * Typed wrapper around Firebase Analytics for the product event taxonomy.
 *
 * Call sites in the integration layer emit events declaratively via
 * {@link AnalyticsService.logEvent}. Tracking never throws.
 *
 * ## Routed per event, not blocked per app
 *
 * Until issue #1098 this service returned early in the business app entirely,
 * because every event it knew belonged to the consumer one and sending a
 * `sign_up` from a staff tablet would have counted a shift as an activation.
 * The table operations of issue #1098 are the first events the business app
 * owns, so the guard moved from the app to the event: each event names its
 * surface in `ANALYTICS_EVENT_SURFACE`, and one that does not match the bundle
 * is dropped. The consumer taxonomy is still silent in the business app, and a
 * table event would be just as silent in the consumer one.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private readonly surface = currentAnalyticsSurface();

  private surfaceDeclared = false;

  logEvent<E extends AnalyticsEventName>(
    event: E,
    ...args: AnalyticsEventParamMap[E] extends never
      ? []
      : [params: AnalyticsEventParamMap[E]]
  ): void {
    if (ANALYTICS_EVENT_SURFACE[event] !== this.surface) {
      return;
    }

    void this.emit(event, args[0] as Record<string, unknown> | undefined);
  }

  private async emit(
    name: string,
    params: Record<string, unknown> | undefined,
  ): Promise<void> {
    await this.declareSurface();

    try {
      await FirebaseAnalytics.logEvent({ name, params });
    } catch (error) {
      // Analytics is best-effort; never let tracking break a user flow.
      console.warn(`Failed to log analytics event "${name}":`, error);
    }
  }

  /**
   * Says which app this session is, once, before the first event leaves.
   *
   * Lazily on the first event rather than from a startup initializer, so an app
   * that never emits one never initializes analytics - which is what the
   * business app did until this issue, and what the admin app still does.
   *
   * Its own try/catch, and the flag set before the call rather than after: a
   * property that cannot be written must not take the event with it, and must
   * not be retried on every event for the rest of the session.
   */
  private async declareSurface(): Promise<void> {
    if (this.surfaceDeclared) {
      return;
    }

    this.surfaceDeclared = true;

    try {
      await FirebaseAnalytics.setUserProperty({
        key: ANALYTICS_SURFACE_USER_PROPERTY,
        value: this.surface,
      });
    } catch (error) {
      console.warn('Failed to declare the analytics surface:', error);
    }
  }
}
