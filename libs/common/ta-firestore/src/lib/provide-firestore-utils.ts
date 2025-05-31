import {
  FirebaseOptions,
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  provideFirestore,
} from '@angular/fire/firestore';
import {
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  provideAuth,
} from '@angular/fire/auth';
import { EnvironmentProviders } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { getApp } from 'firebase/app';
import { provideFirestoreAnalytics } from './analytics/provide-firestore-analytics';

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions,
  withAnalytics?: boolean
): EnvironmentProviders[] => {
  const providersWithoutAnalytics = [
    provideFirebaseApp(() => {
      const firebaseApp = initializeApp(firebaseOptions || {});
      initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
      return firebaseApp;
    }),
    provideFirestore(() => getFirestore()),
    provideAuth(() => {
      if (Capacitor.isNativePlatform()) {
        return initializeAuth(getApp(), {
          persistence: indexedDBLocalPersistence,
        });
      }

      return getAuth();
    }),
  ];

  if (!withAnalytics) {
    return providersWithoutAnalytics;
  }

  return [...providersWithoutAnalytics, provideFirestoreAnalytics()];
};
