import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './components/auth.component';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { CardFeatureModule } from '@travellers-apps/prices/card/feature';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

@NgModule({
  imports: [
    CommonModule,
    PageFeatureModule,
    CardFeatureModule,
    ReactiveFormsModule,
    IonicModule,
  ],
  declarations: [AuthComponent],
  exports: [AuthComponent],
})
export class AuthModule {}
