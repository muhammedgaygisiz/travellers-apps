import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { HomeComponentRoutingModule } from './home-routing.module';
import { HomeComponent } from './components';
import {CardFeatureModule} from "@travellers-apps/prices/card/feature";
import {PageFeatureModule} from "@travellers-apps/prices/page/feature";
import { HomeContainerComponent } from './integration';
import {StoreModule} from "@ngrx/store";
import {fromMostSearched} from "./store";

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    HomeComponentRoutingModule,
    CardFeatureModule,
    PageFeatureModule,
    StoreModule.forFeature(fromMostSearched.featureKey, fromMostSearched.reducer)
  ],
  declarations: [HomeComponent, HomeContainerComponent],
  exports: [HomeComponent],
})
export class HomeComponentModule {}
