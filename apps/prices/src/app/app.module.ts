import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PricesShellModule } from '@travellers-apps/prices/shell/feature';
import { AppComponent } from './app.component';
import { getIonicConfig } from '@travellers-apps/utils-common';
import { PricesStoreModule } from '@travellers-apps/prices/store/feature';
import { environment } from '../environments/environment';
import { FirestoreFeatureModule } from '@travellers-apps/prices/firestore/feature';

@NgModule({
  declarations: [AppComponent],
  imports: [
    IonicModule.forRoot(getIonicConfig()),
    PricesShellModule,
    PricesStoreModule.forRoot(environment),
    FirestoreFeatureModule.forRoot(environment),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
