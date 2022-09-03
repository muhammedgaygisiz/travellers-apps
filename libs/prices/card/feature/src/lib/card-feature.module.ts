import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardComponent } from './card.component';
import {IonicModule} from "@ionic/angular";

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [CardComponent],
  exports: [CardComponent]
})
export class CardFeatureModule {}
