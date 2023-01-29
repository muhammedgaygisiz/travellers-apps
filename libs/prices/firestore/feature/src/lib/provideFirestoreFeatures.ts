import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { FirebaseOptions } from 'firebase/app';

export const provideFirestoreFeatures = (firebaseOptions: FirebaseOptions) => [
  AngularFireModule.initializeApp(firebaseOptions || {}),
  AngularFirestoreModule.enablePersistence({
    synchronizeTabs: false,
  }),
];
