import {
  FirebaseOptions,
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';

export const providePricesFirestore = (firebaseOptions: FirebaseOptions) => [
  provideFirebaseApp(() => initializeApp(firebaseOptions || {})),
  provideFirestore(() => getFirestore()),
  provideAuth(() => getAuth()),
];
