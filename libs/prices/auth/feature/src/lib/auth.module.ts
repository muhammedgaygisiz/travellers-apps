import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthComponent } from './components/auth.component';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { CardFeatureModule } from '@travellers-apps/prices/card/feature';
import { ReactiveFormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AuthRoutingModule } from './auth-routing.module';
import { AuthContainerComponent } from './integration/auth-container.component';
import { PasswordValidatorModule } from '@travellers-apps/prices/password-validator/feature';

@NgModule({
  imports: [
    CommonModule,
    IonicModule,
    PageFeatureModule,
    CardFeatureModule,
    ReactiveFormsModule,
    AuthRoutingModule,
    PasswordValidatorModule,
  ],
  declarations: [AuthComponent, AuthContainerComponent],
  exports: [AuthComponent],
})
export class AuthModule {}
