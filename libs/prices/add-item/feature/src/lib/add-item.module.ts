import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {IonicModule} from "@ionic/angular";
import {PageFeatureModule} from "@travellers-apps/prices/page/feature";
import {AddItemRoutingModule} from "./add-item-routing.module";
import {AddItemComponent} from "./components/add-item.component";
import { AddItemContainerComponent } from './integration/add-item-container.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    AddItemRoutingModule,
    PageFeatureModule
  ],
  declarations: [
    AddItemComponent,
    AddItemContainerComponent,
  ],
  exports: [AddItemComponent]
})
export class AddItemModule {}
