import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthCredentialFields } from '../api/auth-credential-fields';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { getPasswordValidators } from '@travellers-apps/prices/password-validator/feature';
import { PageComponent } from '@travellers-apps/prices/page/feature';
import { CardComponent } from '@travellers-apps/prices/card/feature';
import { IonicModule } from '@ionic/angular';
import { NgIf } from '@angular/common';

@Component({
  standalone: true,
  selector: 'ta-auth',
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss'],
  imports: [
    PageComponent,
    CardComponent,
    IonicModule,
    ReactiveFormsModule,
    NgIf,
  ],
})
export class AuthComponent {
  @Input()
  loginFailed: boolean | null = false;

  @Output()
  public submitAuth: EventEmitter<AuthCredentials> = new EventEmitter();

  @Output()
  public signup: EventEmitter<void> = new EventEmitter();

  @Output()
  public submitSignupWithGoogle: EventEmitter<void> = new EventEmitter();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentialFields>({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>(
      '',
      Validators.compose(getPasswordValidators())
    ),
  });

  public onGoogleSignUp() {
    this.submitSignupWithGoogle.emit();
  }
}
