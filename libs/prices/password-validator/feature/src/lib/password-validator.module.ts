import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PasswordValidatorComponent } from './password-validator/password-validator.component';
import { IonicModule } from '@ionic/angular';

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [PasswordValidatorComponent],
  exports: [PasswordValidatorComponent],
})
export class PasswordValidatorModule {}
