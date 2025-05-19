import {
  EnvironmentProviders,
  ErrorHandler,
  makeEnvironmentProviders,
} from '@angular/core';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getApp } from 'firebase/app';
import { FirebaseErrorHandlerService } from './firebase-error-handler.service';

export const provideFirestoreAnalytics = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideAnalytics(() => getAnalytics(getApp())),
    ScreenTrackingService,
    UserTrackingService,
    { provide: ErrorHandler, useClass: FirebaseErrorHandlerService },
  ]);
