import { NgModule } from '@angular/core';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireModule } from '@angular/fire/compat';
import { Environment, ModuleForStore } from '@travellers-apps/utils-common';
import { FirebaseOptions } from 'firebase/app';

@NgModule({
  imports: [],
  exports: [AngularFirestoreModule],
})
export class FirestoreFeatureModule {
  static forRoot(firebaseOptions: FirebaseOptions): ModuleForStore[] {
    return [AngularFireModule.initializeApp(firebaseOptions || {})];
  }
}
