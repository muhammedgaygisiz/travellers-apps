import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { HomeComponentRoutingModule } from './home-routing.module';
import { HomeComponent } from './components/home.component';
import {CardFeatureModule} from "@travellers-apps/prices/card/feature";
import {PageFeatureModule} from "@travellers-apps/prices/page/feature";
import {HomeContainer} from "./integration/home.container";

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    HomeComponentRoutingModule,
    CardFeatureModule,
    PageFeatureModule,
  ],
  declarations: [HomeComponent, HomeContainer],
  exports: [HomeComponent],
})
export class HomeComponentModule {}
