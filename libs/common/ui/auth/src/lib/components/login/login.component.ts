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
import { PageComponent } from 'common/ui/page';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { Credentials } from '../../api/credentials.model';
import { TranslocoPipe } from '@jsverse/transloco';

interface AuthCredentialFields {
  email: FormControl<string | null>;
  password: FormControl<string | null>;
}

@Component({
  selector: 'ta-login',
  templateUrl: 'login.component.html',
  styleUrls: ['login.component.scss'],
  imports: [
    PageComponent,
    ReactiveFormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonText,
    IonInputPasswordToggle,
    IonSpinner,
    IonContent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  readonly loginFailed = input(false);

  /** Keeps the form locked while a sign-in is in flight (issue #1273). */
  public readonly pending = input(false);

  public readonly submitAuth = output<Credentials>();

  public readonly signup = output();

  public readonly forgotPassword = output<string | null>();

  public readonly submitLoginWithGoogle = output();
  public readonly submitLoginWithApple = output();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentialFields>({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', Validators.required),
  });

  public onSubmit(): void {
    // The disabled button already blocks this, but a queued tap can still land
    // between the click and the pending flag turning on.
    if (this.pending() || !this.authFormGroup.valid) {
      return;
    }

    this.submitAuth.emit(this.authFormGroup.value);
  }

  public onGoogleLogin(): void {
    if (this.pending()) {
      return;
    }

    this.submitLoginWithGoogle.emit();
  }

  public onAppleLogin(): void {
    if (this.pending()) {
      return;
    }

    this.submitLoginWithApple.emit();
  }

  public onForgotPassword(): void {
    this.forgotPassword.emit(this.authFormGroup.controls['email'].value);
  }
}
