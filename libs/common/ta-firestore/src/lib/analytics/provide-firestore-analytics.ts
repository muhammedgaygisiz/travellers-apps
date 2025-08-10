import {
  EnvironmentProviders,
  ErrorHandler,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';

export const provideFirestoreAnalytics = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideAnalytics(() => {
      const app = getApp();
      return getAnalytics(app);
    }),
    ScreenTrackingService,
    UserTrackingService,
    { provide: ErrorHandler, useClass: FirebaseErrorHandlerService },
  ]);
