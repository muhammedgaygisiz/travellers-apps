import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { HomeComponentRoutingModule } from './home-routing.module';
import { HomeComponent } from './components';
import { CardFeatureModule } from '@travellers-apps/prices/card/feature';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { HomeContainerComponent } from './integration';
import { FilterIconPipe } from './pipes/filter-icon.pipe';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    HomeComponentRoutingModule,
    CardFeatureModule,
    PageFeatureModule,
  ],
  declarations: [HomeComponent, HomeContainerComponent, FilterIconPipe],
  exports: [HomeComponent],
})
export class HomeComponentModule {}
