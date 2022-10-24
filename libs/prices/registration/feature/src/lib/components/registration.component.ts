import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
  AuthCredentials,
  digit,
  lowerCase,
  minLength,
  upperCase,
} from '@travellers-apps/utils-common';
import { RegistrationFields } from '../api/registration-fields';

@Component({
  selector: 'ta-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
})
export class RegistrationComponent {
  @Output()
  submitRgistration: EventEmitter<AuthCredentials> = new EventEmitter();

  public registrationFormGroup: FormGroup = new FormGroup<RegistrationFields>({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', this.getPasswordValidator()),
  });

  //TODO: Move this to PasswordValidator Component
  private getPasswordValidator() {
    return Validators.compose([
      Validators.required,
      Validators.pattern(lowerCase),
      Validators.pattern(upperCase),
      Validators.pattern(digit),
      Validators.minLength(minLength),
    ]);
  }
}
