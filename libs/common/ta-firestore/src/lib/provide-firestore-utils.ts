import {
  EnvironmentProviders,
  inject,
  InjectionToken,
  provideAppInitializer,
  Provider,
} from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import {
  enableMultiTabIndexedDbPersistence,
  Firestore,
  initializeFirestore,
} from 'firebase/firestore';
import {
  Auth,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

import {
  FIREBASE_ANALYTICS,
  provideFirestoreAnalytics,
} from './analytics/provide-firestore-analytics';
import {
  Event as RouterEvent,
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationSkipped,
  Router,
} from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import {
  AppCheckReadiness,
  FirebaseAppCheckRuntimeMode,
  initializeFirebaseAppCheck,
  refreshFirebaseAppCheckReadiness,
} from './initialize-firebase-app-check';
import { AppCheckReadinessService } from './app-check-readiness.service';
import { provideFirestoreSimulator } from './provide-firestore-simulator';
import { Emulators } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Analytics } from 'firebase/analytics';
import { AnalyticsConsentService } from './analytics/analytics-consent.service';
import { AuthService } from './auth.service';
import { StartupNavigationService } from './startup-navigation.service';

export const FIREBASE_APP = new InjectionToken<'FIREBASE_APP' | null>(
  'FIREBASE_APP',
);
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>(
  'FIREBASE_FIRESTORE',
);
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

export type FirebaseAppCheckRuntimeContext = {
  production?: boolean;
};

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions,
  withAnalytics?: boolean,
  emulators?: Emulators,
  appCheckRuntimeContext?: FirebaseAppCheckRuntimeContext,
): (EnvironmentProviders | Provider)[] => {
  const app = initializeApp(firebaseOptions || {});
  const firestore: Firestore = initializeFirestore(app, {});
  const startupInitializer = provideFirebaseStartupInitializer(
    app,
    appCheckRuntimeContext,
  );

  if (process.env['NX_APP_BITE_TRIBE_IS_DEV'] !== 'true') {
    // Collection is no longer asserted here. `AnalyticsConsentService` states
    // the flag from the stored decision inside the startup initializer below,
    // which is the first thing that runs and therefore closes the window where
    // an un-consented event could be logged. It keeps the issue #1387 fix -
    // production still asserts the flag on every startup rather than trusting a
    // native default that outlives installs - it just asserts the user's answer.
    return [
      startupInitializer,
      ...provideStandardFirestoreUtils(app, firestore, Boolean(withAnalytics)),
    ];
  }

  console.log('DEV ENVIRONMENT - CONNECTING TO FIREBASE SIMULATORS');
  console.log('DISABLING ANALYTICS');
  void FirebaseAnalytics.setEnabled({ enabled: false });

  if (emulators) {
    const storage = getStorage(app);
    return [
      startupInitializer,
      ...provideFirestoreSimulator(emulators, app, firestore, storage),
    ];
  }

  console.warn(
    'DEV ENVIRONMENT - NX_APP_BITE_TRIBE_IS_DEV is true, but no emulators configuration was provided. Falling back to standard Firestore initialization.',
  );

  return [
    startupInitializer,
    ...provideStandardFirestoreUtils(app, firestore, Boolean(withAnalytics)),
  ];
};

/**
 * Coordinates the App Check startup gate: the readiness service the root
 * component observes, and the callback that starts initial navigation once the
 * app is allowed to proceed. Router initial navigation is disabled in both
 * shells so this is the single place that releases it.
 */
export type AppCheckStartupGate = {
  readiness: Pick<
    AppCheckReadinessService,
    'markReady' | 'markBlocked' | 'registerRetryHandler'
  >;
  startNavigation: () => void | Promise<void>;
};

const provideFirebaseStartupInitializer = (
  app: ReturnType<typeof initializeApp>,
  runtimeContext?: FirebaseAppCheckRuntimeContext,
): EnvironmentProviders =>
  provideAppInitializer(() => {
    const analytics = inject(FIREBASE_ANALYTICS, {
      optional: true,
    }) as Analytics | null;
    const authService = inject(AuthService);
    const consent = inject(AnalyticsConsentService);
    const readiness = inject(AppCheckReadinessService);
    const router = inject(Router);
    const startupNavigation = inject(StartupNavigationService);

    return createFirebaseStartupInitializer(
      app,
      runtimeContext,
      analytics,
      authService,
      consent,
      {
        readiness,
        startNavigation: () => runInitialNavigation(router, startupNavigation),
      },
    )();
  });

/**
 * Triggers the router's initial navigation (disabled in the shells so the App
 * Check gate controls when routing begins) and resolves only once that first
 * navigation settles. Awaiting it keeps the app-initializer blocking until the
 * first route has rendered, matching Angular's default enabled-blocking initial
 * navigation, so startup timing is unchanged when App Check is not enforced.
 *
 * Settling is announced so a deep target held back during startup can be
 * applied without this navigation overwriting it (issue #1244).
 */
const runInitialNavigation = async (
  router: Router,
  startupNavigation: Pick<StartupNavigationService, 'markSettled'>,
): Promise<void> => {
  const settled = firstValueFrom(
    router.events.pipe(filter(isNavigationSettled)),
  );
  router.initialNavigation();
  await settled;
  startupNavigation.markSettled();
};

const isNavigationSettled = (event: RouterEvent): boolean =>
  event instanceof NavigationEnd ||
  event instanceof NavigationCancel ||
  event instanceof NavigationError ||
  event instanceof NavigationSkipped;

export const createFirebaseStartupInitializer =
  (
    app: ReturnType<typeof initializeApp>,
    runtimeContext: FirebaseAppCheckRuntimeContext | undefined,
    analytics: Analytics | null | undefined,
    authService: Pick<AuthService, 'initialize'>,
    consent: Pick<AnalyticsConsentService, 'initialize'>,
    gate: AppCheckStartupGate,
  ): (() => Promise<void>) =>
  async () => {
    // First, and before App Check: `initializeFirebaseAppCheck` logs its own
    // `app_check_startup_started` / `_completed` telemetry, so applying the
    // stored decision any later would let those two events escape the gate on
    // every single launch.
    await consent.initialize();

    const readiness: AppCheckReadiness =
      await createFirebaseAppCheckInitializer(app, runtimeContext, analytics)();

    if (!readiness.ready) {
      // Enforced mode with no usable App Check token: hold auth and navigation,
      // show the retry gate, and only resume when a retry proves readiness.
      gate.readiness.markBlocked();
      gate.readiness.registerRetryHandler(() =>
        retryStartup(runtimeContext, analytics, authService, gate),
      );
      return;
    }

    await resumeStartup(authService, gate);
  };

const retryStartup = async (
  runtimeContext: FirebaseAppCheckRuntimeContext | undefined,
  analytics: Analytics | null | undefined,
  authService: Pick<AuthService, 'initialize'>,
  gate: AppCheckStartupGate,
): Promise<void> => {
  const refreshed = await refreshFirebaseAppCheckReadiness({
    analytics,
    runtimeMode: getAppCheckRuntimeMode(runtimeContext),
  });

  if (refreshed.ready) {
    await resumeStartup(authService, gate);
  }
};

const resumeStartup = async (
  authService: Pick<AuthService, 'initialize'>,
  gate: AppCheckStartupGate,
): Promise<void> => {
  gate.readiness.markReady();
  await authService.initialize();
  await gate.startNavigation();
};

export const createFirebaseAppCheckInitializer =
  (
    app: ReturnType<typeof initializeApp>,
    runtimeContext?: FirebaseAppCheckRuntimeContext,
    analytics?: Analytics | null,
  ): (() => Promise<AppCheckReadiness>) =>
  () =>
    initializeFirebaseAppCheck(app, {
      analytics,
      runtimeMode: getAppCheckRuntimeMode(runtimeContext),
    });

const getAppCheckRuntimeMode = (
  runtimeContext?: FirebaseAppCheckRuntimeContext,
): FirebaseAppCheckRuntimeMode => {
  if (process.env['NX_APP_BITE_TRIBE_IS_DEV'] === 'true') {
    return 'dev_simulator';
  }

  return runtimeContext?.production ? 'production' : 'local_prod_firebase';
};

const provideStandardFirestoreUtils = (
  app: ReturnType<typeof initializeApp>,
  firestore: Firestore,
  withAnalytics: boolean,
): Provider[] => {
  try {
    enableMultiTabIndexedDbPersistence(firestore);
  } catch (err) {
    console.warn('Firebase persistence error: ', err);
  }

  const auth: Auth = Capacitor.isNativePlatform()
    ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
    : getAuth(app);

  const providers: Provider[] = [
    { provide: FIREBASE_APP, useFactory: () => app },
    { provide: FIREBASE_FIRESTORE, useFactory: () => firestore },
    { provide: FIREBASE_AUTH, useFactory: () => auth },
  ];

  const analyticsProviders = provideFirestoreAnalytics() || [];
  return withAnalytics ? [...providers, ...analyticsProviders] : providers;
};
