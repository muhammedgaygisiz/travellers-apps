import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PricesShellModule } from '@travellers-apps/prices/shell/feature';
import { AppComponent } from './app.component';
import {getIonicConfig} from "@travellers-apps/utils-common";
import {PricesPageFeatureModule} from "@travellers-apps/prices/page/feature";

@NgModule({
  declarations: [AppComponent],
  imports: [
    IonicModule.forRoot(getIonicConfig()),
    PricesShellModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
