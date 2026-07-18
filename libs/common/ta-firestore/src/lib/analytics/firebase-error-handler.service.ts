import { inject, Injectable } from '@angular/core';
import { FIREBASE_ANALYTICS } from './provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
import {
  FirebaseCrashlytics,
  StackFrame,
} from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

@Injectable()
export class FirebaseErrorHandlerService {
  analytics = inject(FIREBASE_ANALYTICS);

  async handleError(error: unknown): Promise<void> {
    const err = error as
      | { message?: string; stack?: string; toString(): string }
      | null
      | undefined;
    const message = err?.message || err?.toString() || 'Unknown error';

    logEvent(this.analytics, 'exception', {
      description: message,
      fatal: true,
    });

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
}
