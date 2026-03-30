import { InjectionToken, Provider } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import {
  Auth,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth';
import { getStorage } from 'firebase/storage';

import { provideFirestoreAnalytics } from './analytics/provide-firestore-analytics';
import { provideFirestoreSimulator } from './provide-firestore-simulator';
import { Emulators } from 'utils';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';

export const FIREBASE_APP = new InjectionToken<'FIREBASE_APP' | null>(
  'FIREBASE_APP',
);
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>(
  'FIREBASE_FIRESTORE',
);
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions,
  withAnalytics?: boolean,
  emulators?: Emulators,
): Provider[] => {
  const app = initializeApp(firebaseOptions || {});
  const firestore: Firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });

  if (process.env['NX_APP_BITE_TRIBE_IS_DEV'] === 'true') {
    console.log('DEV ENVIRONMENT - CONNECTING TO FIREBASE SIMULATORS');

    console.log('DISABLING ANALYTICS');
    FirebaseAnalytics.setEnabled({ enabled: false });

    if (emulators) {
      const storage = getStorage(app);
      return provideFirestoreSimulator(emulators, app, firestore, storage);
    }

    console.warn(
      'DEV ENVIRONMENT - NX_APP_BITE_TRIBE_IS_DEV is true, but no emulators configuration was provided. Falling back to standard Firestore initialization.',
    );
  }

  const auth: Auth = Capacitor.isNativePlatform()
    ? getAuth(app)
    : initializeAuth(app, { persistence: indexedDBLocalPersistence });

  const providers: Provider[] = [
    { provide: FIREBASE_APP, useFactory: () => app },
    { provide: FIREBASE_FIRESTORE, useFactory: () => firestore },
    { provide: FIREBASE_AUTH, useFactory: () => auth },
  ];

  const analyticsProviders = provideFirestoreAnalytics() || [];
  return withAnalytics ? [...providers, ...analyticsProviders] : providers;
};
