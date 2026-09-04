export { AuthActions } from './lib/ngrx-store/actions';

export { fromAuth } from './lib/ngrx-store';

export { AuthEffects } from './lib/ngrx-store/effects';

export { provideFirestoreUtils } from './lib/provide-firestore-utils';
export { provideFirestoreState } from './lib/ngrx-store/provide-firestore-state';
export { provideFirestoreAnalytics } from './lib/analytics/provide-firestore-analytics';
export { AnalyticsService } from './lib/analytics/analytics.service';
export { CrashReportingService } from './lib/analytics/crash-reporting.service';
export {
  AnalyticsConsentService,
  UNSET_CONSENT,
  type ConsentDecision,
  type ConsentState,
} from './lib/analytics/analytics-consent.service';
export { redactErrorDescription } from './lib/analytics/redact-error-description';
export {
  AnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsEventParamMap,
} from './lib/analytics/analytics-events';

export { authGuard } from './lib/auth.guard';
export { startGuard } from './lib/start.guard';
export { RequestedUrlService } from './lib/requested-url.service';
export { freshSessionGuard } from './lib/fresh-session.guard';

export { AuthService } from './lib/auth.service';

export { AppCheckReadinessService } from './lib/app-check-readiness.service';
export { StartupNavigationService } from './lib/startup-navigation.service';
export { AppCheckGateComponent } from './lib/app-check-gate/app-check-gate.component';
export { AnalyticsConsentGateComponent } from './lib/analytics-consent-gate/analytics-consent-gate.component';
export { isFirebaseAppCheckEnforced } from './lib/initialize-firebase-app-check';
