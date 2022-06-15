import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FooterToolBarComponent } from './footer-tool-bar.component';
import {IonicModule} from "@ionic/angular";

@NgModule({
  imports: [CommonModule, IonicModule.forRoot()],
  declarations: [FooterToolBarComponent],
  exports: [FooterToolBarComponent],
})
export class FooterToolBarFeatureModule {}
