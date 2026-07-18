import { ErrorHandler, InjectionToken, Provider } from '@angular/core';
import { getApp } from 'firebase/app';
import { Analytics, getAnalytics } from 'firebase/analytics';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';

export const FIREBASE_ANALYTICS = new InjectionToken<Analytics>(
  'FIREBASE_ANALYTICS',
);

export const provideFirestoreAnalytics = (): Provider[] => {
  return [
    {
      provide: FIREBASE_ANALYTICS,
      useFactory: (): Analytics | null => {
        if (typeof window === 'undefined') {
          return null;
        }

        try {
          const app = getApp();
          return getAnalytics(app);
        } catch {
          console.warn(
            'Firebase Analytics is not supported in this environment.',
          );
          return null;
        }
      },
    },
    { provide: ErrorHandler, useClass: FirebaseErrorHandlerService },
  ];
};
