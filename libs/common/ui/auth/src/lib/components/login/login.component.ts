import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { getPasswordValidators } from '@travellers-apps/prices/password-validator/feature';
import { PageComponent } from 'common/ui/page';
import { CardComponent } from 'common/ui/card';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonText,
} from '@ionic/angular/standalone';
import { Credentials } from '../../api/credentials.model';

interface AuthCredentialFields {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

@Component({
  selector: 'ta-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [
    PageComponent,
    CardComponent,
    ReactiveFormsModule,
    IonButton,
    IonIcon,
    IonItem,
    IonInput,
    IonText,
  ],
})
export class LoginComponent {
  @Input()
  loginFailed: boolean = false;

  @Output()
  public submitAuth: EventEmitter<Credentials> = new EventEmitter();

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
