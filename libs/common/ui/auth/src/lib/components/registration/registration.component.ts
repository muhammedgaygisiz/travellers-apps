import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  getPasswordValidators,
  passwordMatchValidator,
  PasswordValidatorComponent,
} from 'common/password-validator';
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonInput,
  IonInputPasswordToggle,
  IonText,
} from '@ionic/angular/standalone';
import { Credentials } from '../../api/credentials.model';

interface RegistrationFields {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
  passwordConfirm: FormControl<string | null>;
}

@Component({
  selector: 'ta-registration',
  templateUrl: 'registration.component.html',
  styleUrls: ['registration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    ReactiveFormsModule,
    PasswordValidatorComponent,
    IonInput,
    IonButton,
    IonText,
    IonInputPasswordToggle,
    IonContent,
  ],
})
export class RegistrationComponent {
  public readonly registrationError = input<string | null>('');

  public readonly submitRegistration = output<Credentials>();

  public registrationFormGroup: FormGroup = new FormGroup<RegistrationFields>(
    {
      email: new FormControl<string>('', [
        Validators.required,
        Validators.email,
      ]),
      password: new FormControl<string>(
        '',
        Validators.compose(getPasswordValidators()),
      ),
      passwordConfirm: new FormControl<string>(
        '',
        Validators.compose(getPasswordValidators()),
      ),
    },
    {
      validators: passwordMatchValidator,
      updateOn: 'change',
    },
  );
}
