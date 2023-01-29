import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RegistrationComponent } from './components/registration.component';
import { IonicModule } from '@ionic/angular';
import { PasswordValidatorModule } from '@travellers-apps/prices/password-validator/feature';
import { ReactiveFormsModule } from '@angular/forms';
import { RegistrationRoutingModule } from './registration-routing.module';
import { RegistrationContainerComponent } from './integration/registration-container.component';
import { CardComponent } from '@travellers-apps/prices/card/feature';
import { PageComponent } from '@travellers-apps/prices/page/feature';

@NgModule({
  imports: [
    CommonModule,
    CardComponent,
    IonicModule,
    PasswordValidatorModule,
    ReactiveFormsModule,
    RegistrationRoutingModule,
    PageComponent,
  ],
  declarations: [RegistrationComponent, RegistrationContainerComponent],
  exports: [RegistrationComponent],
})
export class RegistrationModule {}
