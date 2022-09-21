import { NgModule } from '@angular/core';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireModule } from '@angular/fire/compat';
import { Environment, ModuleForStore } from '@travellers-apps/utils-common';

@NgModule({
  imports: [],
  exports: [AngularFirestoreModule],
})
export class FirestoreFeatureModule {
  static forRoot(environment: Environment): ModuleForStore[] {
    return [AngularFireModule.initializeApp(environment.firebaseConfig || {})];
  }
}
