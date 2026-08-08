import { Injectable } from '@angular/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

/**
 * Files a deliberate, non-fatal Crashlytics report for a failure the app
 * handles itself.
 *
 * `FirebaseErrorHandlerService` only sees what Angular's `ErrorHandler` is
 * given, which is nothing when a failure is caught and turned into a message on
 * screen. Those are exactly the failures a user cannot report usefully — the
 * details page answering a missing Bite is one — so they take the same
 * `recordException` route rather than a new mechanism. See GitHub issue #1232.
 *
 * Crashlytics only exists on a native platform; on the web this stays a console
 * note so the branch is still visible while developing.
 */
@Injectable({ providedIn: 'root' })
export class CrashReportingService {
  async recordNonFatal(
    message: string,
    context: Record<string, string | undefined> = {},
  ): Promise<void> {
    const detail = Object.entries(context)
      .filter(([, value]) => !!value)
      .map(([key, value]) => `${key}=${value}`)
      .join(' ');

    const report = detail ? `${message} (${detail})` : message;

    if (!Capacitor.isNativePlatform()) {
      console.warn('Non-fatal:', report);

      return;
    }

    try {
      await FirebaseCrashlytics.recordException({ message: report });
    } catch (error) {
      console.error('Error reporting to Crashlytics:', error);
    }
  }
}
