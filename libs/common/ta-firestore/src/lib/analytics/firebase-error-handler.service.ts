import { inject, Injectable } from '@angular/core';
import { Analytics, logEvent } from '@angular/fire/analytics';

@Injectable()
export class FirebaseErrorHandlerService {
  analytics = inject(Analytics);

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
