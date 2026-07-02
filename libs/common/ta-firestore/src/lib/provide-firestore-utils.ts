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
  FirebaseAppCheckRuntimeMode,
  initializeFirebaseAppCheck,
} from './initialize-firebase-app-check';
import { provideFirestoreSimulator } from './provide-firestore-simulator';
import { Emulators } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { Analytics } from 'firebase/analytics';

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
  const appCheckInitializer = provideFirebaseAppCheckInitializer(
    app,
    appCheckRuntimeContext,
  );

  if (process.env['NX_APP_BITE_TRIBE_IS_DEV'] !== 'true') {
    return [
      appCheckInitializer,
      ...provideStandardFirestoreUtils(app, firestore, Boolean(withAnalytics)),
    ];
  }

  console.log('DEV ENVIRONMENT - CONNECTING TO FIREBASE SIMULATORS');
  console.log('DISABLING ANALYTICS');
  FirebaseAnalytics.setEnabled({ enabled: false });

  if (emulators) {
    const storage = getStorage(app);
    return [
      appCheckInitializer,
      ...provideFirestoreSimulator(emulators, app, firestore, storage),
    ];
  }

  console.warn(
    'DEV ENVIRONMENT - NX_APP_BITE_TRIBE_IS_DEV is true, but no emulators configuration was provided. Falling back to standard Firestore initialization.',
  );

  return [
    appCheckInitializer,
    ...provideStandardFirestoreUtils(app, firestore, Boolean(withAnalytics)),
  ];
};

const provideFirebaseAppCheckInitializer = (
  app: ReturnType<typeof initializeApp>,
  runtimeContext?: FirebaseAppCheckRuntimeContext,
): EnvironmentProviders =>
  provideAppInitializer(() => {
    const analytics = inject(FIREBASE_ANALYTICS, {
      optional: true,
    }) as Analytics | null;

    return createFirebaseAppCheckInitializer(app, runtimeContext, analytics)();
  });

export const createFirebaseAppCheckInitializer =
  (
    app: ReturnType<typeof initializeApp>,
    runtimeContext?: FirebaseAppCheckRuntimeContext,
    analytics?: Analytics | null,
  ): (() => Promise<void>) =>
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
