import { Component, EventEmitter, Output } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { AuthCredentials } from '../api/auth-credentials';
import {
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
  @Output()
  public submitAuth: EventEmitter<AuthCredentials> = new EventEmitter();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentials>({
    username: new FormControl<string>('', [Validators.required]),
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
