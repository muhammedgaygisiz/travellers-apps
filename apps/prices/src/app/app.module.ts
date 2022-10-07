import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PricesShellModule } from '@travellers-apps/prices/shell/feature';
import { AppComponent } from './app.component';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { PricesStoreModule } from '@travellers-apps/prices/store/feature';
import { environment } from '../environments/environment';
import { FirestoreFeatureModule } from '@travellers-apps/prices/firestore/feature';
import { Geolocation } from '@awesome-cordova-plugins/geolocation/ngx';

@NgModule({
  declarations: [AppComponent],
  imports: [
    IonicModule.forRoot(getIonicConfig()),
    PricesShellModule,
    PricesStoreModule.forRoot(environment),
    FirestoreFeatureModule.forRoot({
      apiKey: process.env['NX_APP_API_KEY'],
      authDomain: process.env['NX_APP_AUTH_DOMAIN'],
      projectId: process.env['NX_APP_PROJECT_ID'],
      storageBucket: process.env['NX_APP_STORAGE_BUCKET'],
      messagingSenderId: process.env['NX_APP_MESSAGINX_SENDER_ID'],
    }),
  ],
  providers: [Geolocation],
  bootstrap: [AppComponent],
})
export class AppModule {}
