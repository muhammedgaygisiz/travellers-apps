import { inject, Injectable } from '@angular/core';
import { FIREBASE_ANALYTICS } from './provide-firestore-analytics';
import { logEvent } from 'firebase/analytics';
@Injectable()
export class FirebaseErrorHandlerService {
  analytics = inject(FIREBASE_ANALYTICS);

  handleError(error: any): void {
    const message = error?.message || error?.toString() || 'Unknown error';

    logEvent(this.analytics, 'exception', {
      description: message,
      fatal: true,
    });

    // Optionally, rethrow the error or log it to console
    console.error('Captured error:', error);
  }
}
