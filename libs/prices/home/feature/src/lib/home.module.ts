import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { HomeComponentRoutingModule } from './home-routing.module';
import { HomeComponent } from './home.component';
import {CardFeatureModule} from "@travellers-apps/prices/card/feature";
import {PricesPageFeatureModule} from "@travellers-apps/prices/page/feature";

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    HomeComponentRoutingModule,
    CardFeatureModule,
    PricesPageFeatureModule,
  ],
  declarations: [HomeComponent],
  exports: [HomeComponent],
})
export class HomeComponentModule {}
