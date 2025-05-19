import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import {
  getAnalytics,
  provideAnalytics,
  ScreenTrackingService,
  UserTrackingService,
} from '@angular/fire/analytics';
import { getApp } from 'firebase/app';

export const provideFirestoreAnalytics = (): EnvironmentProviders =>
  makeEnvironmentProviders([
    provideAnalytics(() => getAnalytics(getApp())),
    ScreenTrackingService,
    UserTrackingService,
  ]);
