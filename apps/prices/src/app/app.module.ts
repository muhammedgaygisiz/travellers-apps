import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PricesShellModule } from '@travellers-apps/prices/shell/feature';
import { AppComponent } from './app.component';
import { FooterToolBarFeatureModule } from '@travellers-apps/prices/footer-tool-bar/feature';

@NgModule({
  declarations: [AppComponent],
  imports: [
    IonicModule.forRoot(),
    PricesShellModule,
    FooterToolBarFeatureModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
