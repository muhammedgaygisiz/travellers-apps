import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {HeaderToolBarComponent} from './header-tool-bar.component';
import {IonicModule} from "@ionic/angular";

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [HeaderToolBarComponent],
  exports: [HeaderToolBarComponent]
})
export class HeaderToolBarFeatureModule {
}
