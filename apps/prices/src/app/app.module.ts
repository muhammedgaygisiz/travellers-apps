import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { PricesShellModule } from '@travellers-apps/prices/shell/feature';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [IonicModule.forRoot(), PricesShellModule],
  bootstrap: [AppComponent],
})
export class AppModule {}
