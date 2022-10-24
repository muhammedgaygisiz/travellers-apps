import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationComponent } from './components/registration.component';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { CardFeatureModule } from '@travellers-apps/prices/card/feature';
import { IonicModule } from '@ionic/angular';
import { PasswordValidatorModule } from '@travellers-apps/prices/password-validator/feature';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
  imports: [
    CommonModule,
    PageFeatureModule,
    CardFeatureModule,
    IonicModule,
    PasswordValidatorModule,
    ReactiveFormsModule,
  ],
  declarations: [RegistrationComponent],
  exports: [RegistrationComponent],
})
export class RegistrationModule {}
