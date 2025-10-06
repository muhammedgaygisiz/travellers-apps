import { inject, Injectable } from '@angular/core';
import { FIREBASE_ANALYTICS } from './provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

@Injectable()
export class FirebaseErrorHandlerService {
  analytics = inject(FIREBASE_ANALYTICS);

  async handleError(error: any): Promise<void> {
    const message = error?.message || error?.toString() || 'Unknown error';

    logEvent(this.analytics, 'exception', {
      description: message,
      fatal: true,
    });

    if (Capacitor.isNativePlatform()) {
      try {
        await FirebaseCrashlytics.recordException({
          message: error.message || 'Unknown Angular error',
          stacktrace: error.stack || '',
        });
      } catch (e: any) {
        console.error('Error reporting to Crashlytics:', e);
        return;
      }
    }

    // Optionally, rethrow the error or log it to console
    console.error('Captured error:', error);
  }
}
