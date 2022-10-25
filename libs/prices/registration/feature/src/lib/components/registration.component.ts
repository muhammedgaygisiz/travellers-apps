import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { RegistrationFields } from '../api/registration-fields';
import {
  getPasswordValidators,
  passwordMatchValidator,
} from '@travellers-apps/prices/password-validator/feature';

@Component({
  selector: 'ta-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
})
export class RegistrationComponent {
  @Output()
  submitRgistration: EventEmitter<AuthCredentials> = new EventEmitter();

  public registrationFormGroup: FormGroup = new FormGroup<RegistrationFields>(
    {
      email: new FormControl<string>('', [
        Validators.required,
        Validators.email,
      ]),
      password: new FormControl<string>(
        '',
        Validators.compose(getPasswordValidators())
      ),
      passwordConfirm: new FormControl<string>(
        '',
        Validators.compose(getPasswordValidators())
      ),
    },
    { validators: passwordMatchValidator, updateOn: 'blur' }
  );
}
