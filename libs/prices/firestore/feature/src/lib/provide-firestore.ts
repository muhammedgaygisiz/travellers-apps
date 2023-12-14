import {
  FirebaseOptions,
  initializeApp,
  provideFirebaseApp,
} from '@angular/fire/app';
import {
  getFirestore,
  provideFirestore as provFireStore,
} from '@angular/fire/firestore';
import { getAuth, provideAuth } from '@angular/fire/auth';

export const provideFirestore = (firebaseOptions: FirebaseOptions) => [
  provideFirebaseApp(() => initializeApp(firebaseOptions || {})),
  provFireStore(() => getFirestore()),
  provideAuth(() => getAuth()),
];
