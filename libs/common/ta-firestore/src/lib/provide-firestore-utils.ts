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
  Firestore,
  FirestoreSettings,
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager,
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
  AppCheckRecoveryTrigger,
  initializeFirebaseAppCheck,
  onFirebaseAppCheckTokenChanged,
  refreshFirebaseAppCheckReadiness,
  reportFirebaseAppCheckRecovered,
} from './initialize-firebase-app-check';
import {
  AppCheckReadinessService,
  AppCheckRetryContext,
} from './app-check-readiness.service';
import { provideFirestoreSimulator } from './provide-firestore-simulator';
import { Emulators } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Analytics } from 'firebase/analytics';
import { AuthService } from './auth.service';
import { StartupNavigationService } from './startup-navigation.service';
import { preloadFirestoreWebPlugin } from './preload-firestore-web-plugin';

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

/**
 * Re-asserts native Firebase Analytics collection on every non-dev startup.
 *
 * The native SDKs persist the flag set by `setEnabled` - Android in the app's
 * SharedPreferences, iOS in its user defaults - so the DEV-only
 * `setEnabled({ enabled: false })` below outlives the process, the build, and
 * the install that made the call. A device that once ran a dev build
 * therefore kept native collection off in every later production build, which
 * is exactly what run 9 of the release-candidate charter observed on Android
 * (`App measurement disabled by setAnalyticsCollectionEnabled(false)`, issue
 * #1387). Production has to state the flag rather than trust the SDK default.
 *
 * Only native platforms are touched. On web the same plugin call sets a
 * per-page-load `ga-disable-*` window flag that nothing persists, so there is
 * no leak to undo there, and calling it here would eagerly initialize web
 * analytics for apps - the business app among them - that never asked for it.
 */
const enableNativeAnalyticsCollection = (): void => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  FirebaseAnalytics.setEnabled({ enabled: true }).catch((error) => {
    // Analytics is best-effort; a failed flag must not break startup.
    console.warn('Failed to enable native analytics collection:', error);
  });
};

/**
 * The persistent cache, owned by one tab at a time (GitHub issue #1902).
 *
 * The multi-tab cache that was here before makes one tab per browser profile
 * the only one that talks to Firestore; every other tab sends its reads
 * through it. App Check is enforced on Firestore, so a tab whose App Check
 * token had died - a tab left open for days, still on an old build behind
 * the update dialog - turned every read in every other tab into "Missing or
 * insufficient permissions", including reads of the account's own data, and
 * reloading the affected tab did not help.
 *
 * With a single-tab manager the first tab keeps the IndexedDB cache, which is
 * what the offline staff view of issue #1096 reads from. A second tab cannot
 * take the lease, and the SDK falls it back to a memory cache with a warning
 * (`Error using user provided cache. Falling back to memory cache`). That tab
 * then holds its own connection and sends its own App Check token, so no tab
 * depends on another's.
 */
const firestoreCacheSettings = (): FirestoreSettings => ({
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager(undefined),
  }),
});

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions,
  withAnalytics?: boolean,
  emulators?: Emulators,
  appCheckRuntimeContext?: FirebaseAppCheckRuntimeContext,
): (EnvironmentProviders | Provider)[] => {
  const app = initializeApp(firebaseOptions || {});
  const usesEmulators =
    process.env['NX_APP_BITE_TRIBE_IS_DEV'] === 'true' && Boolean(emulators);
  const firestore: Firestore = initializeFirestore(
    app,
    usesEmulators ? {} : firestoreCacheSettings(),
  );
  const startupInitializer = provideFirebaseStartupInitializer(
    app,
    appCheckRuntimeContext,
  );

  if (process.env['NX_APP_BITE_TRIBE_IS_DEV'] !== 'true') {
    enableNativeAnalyticsCollection();

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
 * Coordinates the App Check gate: the readiness service the root component
 * observes, and the callback that starts initial navigation once the app is
 * allowed to proceed. Router initial navigation is disabled in both shells so
 * this is the single place that releases it, and the single place that lifts
 * the gate again after a mid-session loss (issue #1621).
 */
export type AppCheckStartupGate = {
  readiness: Pick<
    AppCheckReadinessService,
    'isBlocked' | 'markReady' | 'registerRetryHandler' | 'startRecovery'
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
    const readiness = inject(AppCheckReadinessService);
    const router = inject(Router);
    const startupNavigation = inject(StartupNavigationService);

    return createFirebaseStartupInitializer(
      app,
      runtimeContext,
      analytics,
      authService,
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
    gate: AppCheckStartupGate,
  ): (() => Promise<void>) =>
  async () => {
    // Whether auth and the first navigation have already run, so a later
    // re-check only has to lift the gate.
    const startup = { resumed: false };

    // Registered before the verdict rather than on the failure branch, because
    // the path that needs it most is the one that succeeded. A page that
    // started with a token and lost it afterwards used to call `retry()` into
    // nothing, and a reload was the only way back (issue #1621).
    gate.readiness.registerRetryHandler((context) =>
      retryStartup(
        runtimeContext,
        analytics,
        authService,
        gate,
        startup,
        context,
      ),
    );

    const readiness: AppCheckReadiness =
      await createFirebaseAppCheckInitializer(app, runtimeContext, analytics)();

    // After the provider is registered, because the web plugin subscribes to
    // nothing before that. Kept for the life of the page: a token the SDK
    // fetches by itself ends a block whenever it arrives, at startup or after
    // a mid-session loss, without waiting for the next re-check (issue #1465).
    void onFirebaseAppCheckTokenChanged(() =>
      liftBlock(runtimeContext, analytics, authService, gate, startup, {
        trigger: 'token_listener',
      }),
    );

    if (!readiness.ready) {
      // Enforced mode with no usable App Check token: hold auth and
      // navigation and wait for one. Not awaited, so the initializer returns
      // and the shell can render its loading screen while the bounded
      // recovery runs; nobody is asked to tap anything (issue #1465).
      void gate.readiness.startRecovery();
      return;
    }

    await resumeStartup(authService, gate, startup);
  };

const retryStartup = async (
  runtimeContext: FirebaseAppCheckRuntimeContext | undefined,
  analytics: Analytics | null | undefined,
  authService: Pick<AuthService, 'initialize'>,
  gate: AppCheckStartupGate,
  startup: { resumed: boolean },
  context?: AppCheckRetryContext,
): Promise<void> => {
  const trigger = context?.requireToken ? 'recovery' : 'retry';
  const refreshed = await refreshFirebaseAppCheckReadiness({
    analytics,
    runtimeMode: getAppCheckRuntimeMode(runtimeContext),
    trigger,
    attempt: context?.attempt,
  });

  if (refreshed.ready) {
    await liftBlock(runtimeContext, analytics, authService, gate, startup, {
      trigger,
      attempt: context?.attempt,
    });
  }
};

/**
 * Ends a block, once, however it ended.
 *
 * A re-check and the token listener can both find the token within the same
 * moment. Whichever arrives first lifts the gate and reports the recovery;
 * the other finds the app no longer blocked and does nothing, so a recovery is
 * counted once and a token refresh on a healthy page is not counted at all.
 */
const liftBlock = async (
  runtimeContext: FirebaseAppCheckRuntimeContext | undefined,
  analytics: Analytics | null | undefined,
  authService: Pick<AuthService, 'initialize'>,
  gate: AppCheckStartupGate,
  startup: { resumed: boolean },
  recovery: { trigger: AppCheckRecoveryTrigger; attempt?: number },
): Promise<void> => {
  if (!gate.readiness.isBlocked()) {
    return;
  }

  void reportFirebaseAppCheckRecovered({
    analytics,
    runtimeMode: getAppCheckRuntimeMode(runtimeContext),
    ...recovery,
  });

  await resumeStartup(authService, gate, startup);
};

/**
 * Lifts the gate, and starts the app the first time only.
 *
 * A mid-session recovery reaches this too, and by then auth has its listener
 * and the router has been through its initial navigation. Running either again
 * would register a second `authStateChange` listener and navigate the operator
 * away from the page they were on, so the recovery does the one thing it is
 * for: it marks the app ready and leaves it where it was (issue #1621).
 */
const resumeStartup = async (
  authService: Pick<AuthService, 'initialize'>,
  gate: AppCheckStartupGate,
  startup: { resumed: boolean },
): Promise<void> => {
  gate.readiness.markReady();

  if (startup.resumed) {
    return;
  }

  startup.resumed = true;
  // Before auth, because signing in is what starts several Firestore
  // listeners at once (issue #1835).
  await preloadFirestoreWebPlugin();
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
