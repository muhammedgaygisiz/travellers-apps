import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthCredentialFields } from '../api/auth-credential-fields';
import {
  AuthCredentials,
  digit,
  lowerCase,
  minLength,
  upperCase,
} from '@travellers-apps/utils-common';

@Component({
  selector: 'ta-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
})
export class AuthComponent {
  @Input()
  loginFailed: boolean | null = false;

  @Output()
  public submitAuth: EventEmitter<AuthCredentials> = new EventEmitter();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentialFields>({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', this.getPasswordValidator()),
  });

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
