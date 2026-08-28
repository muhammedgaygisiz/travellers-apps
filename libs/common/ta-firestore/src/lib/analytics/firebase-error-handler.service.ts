import { inject, Injectable } from '@angular/core';
import { FIREBASE_ANALYTICS } from './provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import {
  FirebaseCrashlytics,
  StackFrame,
} from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

@Injectable()
export class FirebaseErrorHandlerService {
  analytics = inject(FIREBASE_ANALYTICS, { optional: true });

  async handleError(error: unknown): Promise<void> {
    const err = error as
      | { message?: string; stack?: string; toString(): string }
      | null
      | undefined;
    const message = err?.message || err?.toString() || 'Unknown error';

    this.logException(message);

    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseCrashlytics.recordException({
          message: err?.message || 'Unknown Angular error',
          // The stack string is preserved as-is (the API types this as
          // StackFrame[], but the original behaviour passed the raw stack).
          stacktrace: (err?.stack || '') as unknown as StackFrame[],
        });
      } catch (e) {
        console.error('Error reporting to Crashlytics:', e);
        return;
      }
    }

    // Optionally, rethrow the error or log it to console
    console.error('Captured error:', error);
  }

  /**
   * Emits `exception` on the platform's own analytics transport: the Capacitor
   * plugin, which is the native SDK on iOS and Android, and the JS SDK on the
   * web. That is the split the rest of the app uses - `AnalyticsService`,
   * `setCurrentScreen`, `setUserId`, and the App Check telemetry all route this
   * way - and this handler was the one place still sending native traffic
   * through the JS SDK, so exceptions were reported on a different measurement
   * path than every other event the same device produced (issue #1387).
   *
   * It stays fire-and-forget: reporting a failure must not delay the Crashlytics
   * report behind it, and must never raise a second failure of its own. The web
   * instance is optional because `provideFirestoreAnalytics` yields null where
   * analytics is unsupported.
   */
  private logException(description: string): void {
    const params = { description, fatal: true };

    if (Capacitor.isNativePlatform()) {
      FirebaseAnalytics.logEvent({ name: 'exception', params }).catch(
        (error) => {
          console.warn('Failed to log the exception event:', error);
        },
      );

      return;
    }

    if (!this.analytics) {
      return;
    }

    logEvent(this.analytics, 'exception', params);
  }
}
