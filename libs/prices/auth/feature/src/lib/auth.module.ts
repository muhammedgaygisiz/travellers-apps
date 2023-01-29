import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './components/auth.component';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthContainerComponent } from './integration/auth-container.component';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    PageFeatureModule,
    ReactiveFormsModule,
    AuthRoutingModule,
  ],
  declarations: [AuthComponent, AuthContainerComponent],
  exports: [AuthComponent],
})
export class AuthModule {}
