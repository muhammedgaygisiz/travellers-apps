import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { Emulators } from 'utils';
import { Provider } from '@angular/core';
import {
  FIREBASE_APP,
  FIREBASE_AUTH,
  FIREBASE_FIRESTORE,
} from './provide-firestore-utils';
import { FirebaseApp } from '@firebase/app';
import { connectFirestoreEmulator, Firestore } from 'firebase/firestore';

export const provideFirestoreSimulator = (
  emulators: Emulators | undefined = {
    host: '',
    firestorePort: 0,
    storagePort: 0,
    authUrl: '',
  },
  app: FirebaseApp,
  firestore: Firestore,
): Provider[] => {
  const auth = getAuth();

  connectAuthEmulator(auth, emulators.authUrl, { disableWarnings: true });
  connectFirestoreEmulator(firestore, emulators.host, emulators.firestorePort);

  return [
    { provide: FIREBASE_APP, useFactory: () => app },
    { provide: FIREBASE_FIRESTORE, useFactory: () => firestore },
    { provide: FIREBASE_AUTH, useFactory: () => auth },
  ];
};
