import { InjectionToken, Provider } from '@angular/core';
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
  initializeAuth as fbInitializeAuth,
} from 'firebase/auth';
import { provideFirestoreAnalytics } from './analytics/provide-firestore-analytics';

export const FIREBASE_APP = new InjectionToken<'FIREBASE_APP' | null>(
  'FIREBASE_APP'
);
export const FIREBASE_FIRESTORE = new InjectionToken<Firestore>(
  'FIREBASE_FIRESTORE'
);
export const FIREBASE_AUTH = new InjectionToken<Auth>('FIREBASE_AUTH');

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions,
  withAnalytics?: boolean
): Provider[] => {
  const app = initializeApp(firebaseOptions || {});
  const firestore: Firestore = initializeFirestore(app, {});

  enableMultiTabIndexedDbPersistence(firestore).catch((err) => {
    console.warn('Firebase persistence error: ', err);
  });

  const auth: Auth = Capacitor.isNativePlatform()
    ? fbInitializeAuth(app, { persistence: indexedDBLocalPersistence })
    : getAuth(app);

  const providers: Provider[] = [
    { provide: FIREBASE_APP, useFactory: () => app },
    { provide: FIREBASE_FIRESTORE, useFactory: () => firestore },
    { provide: FIREBASE_AUTH, useFactory: () => auth },
  ];

  const analyticsProviders = provideFirestoreAnalytics() || [];
  return withAnalytics ? [...providers, ...analyticsProviders] : providers;
};
