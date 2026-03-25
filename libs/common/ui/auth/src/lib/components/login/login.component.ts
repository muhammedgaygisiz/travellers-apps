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
  IonText,
} from '@ionic/angular/standalone';
import { Credentials } from '../../api/credentials.model';

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
    IonContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  readonly loginFailed = input(false);

  public readonly submitAuth = output<Credentials>();

  public readonly signup = output();

  public readonly submitSignupWithGoogle = output();
  public readonly submitSignupWithApple = output();

  public authFormGroup: FormGroup = new FormGroup<AuthCredentialFields>({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
    password: new FormControl<string>('', Validators.required),
  });

  public onGoogleSignUp(): void {
    this.submitSignupWithGoogle.emit();
  }

  public onAppleSignUp(): void {
    this.submitSignupWithApple.emit();
  }
}
