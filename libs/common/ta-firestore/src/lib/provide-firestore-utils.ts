import {
  FirebaseOptions,
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { EnvironmentProviders } from '@angular/core';

export const provideFirestoreUtils = (
  firebaseOptions: FirebaseOptions
): EnvironmentProviders[] => [
  provideFirebaseApp(() => initializeApp(firebaseOptions || {})),
  provideFirestore(() => getFirestore()),
  provideAuth(() => getAuth()),
];
