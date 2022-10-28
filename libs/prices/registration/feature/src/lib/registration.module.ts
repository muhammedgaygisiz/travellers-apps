import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationComponent } from './components/registration.component';
import { PageFeatureModule } from '@travellers-apps/prices/page/feature';
import { CardFeatureModule } from '@travellers-apps/prices/card/feature';
import { IonicModule } from '@ionic/angular';
import { PasswordValidatorModule } from '@travellers-apps/prices/password-validator/feature';
import { ReactiveFormsModule } from '@angular/forms';
import { RegistrationRoutingModule } from './registration-routing.module';
import { RegistrationContainerComponent } from './integration/registration-container.component';

@NgModule({
  imports: [
    CommonModule,
    PageFeatureModule,
    CardFeatureModule,
    IonicModule,
    PasswordValidatorModule,
    ReactiveFormsModule,
    RegistrationRoutingModule,
  ],
  declarations: [RegistrationComponent, RegistrationContainerComponent],
  exports: [RegistrationComponent],
})
export class RegistrationModule {}