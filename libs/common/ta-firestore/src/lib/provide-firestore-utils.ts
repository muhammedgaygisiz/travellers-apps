import {
  FirebaseOptions,
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import {
  getAuth,
  initializeAuth,
  provideAuth,
  indexedDBLocalPersistence,
} from '@angular/fire/auth';
import { EnvironmentProviders } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { getApp } from 'firebase/app';

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions
): EnvironmentProviders[] => [
  provideFirebaseApp(() => initializeApp(firebaseOptions || {})),
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
