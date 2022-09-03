import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageComponent } from './page.component';
import {IonicModule} from "@ionic/angular";

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [PageComponent],
  exports: [PageComponent]
})
export class PricesPageFeatureModule {}
