import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  IonButton,
  IonContent,
  IonInput,
  IonText,
} from '@ionic/angular/standalone';
import { PageComponent } from 'common/ui/page';

interface ForgotPasswordFields {
  email: FormControl<string | null>;
}

@Component({
  selector: 'ta-forgot-password',
  templateUrl: 'forgot-password.component.html',
  styleUrls: ['forgot-password.component.scss'],
  imports: [
    PageComponent,
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonInput,
    IonText,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  readonly initialEmail = input<string | null>(null);
  readonly resetRequested = input(false);
  readonly resetFailed = input(false);

  readonly submitPasswordReset = output<string>();
  readonly backToLogin = output();

  readonly forgotPasswordFormGroup = new FormGroup<ForgotPasswordFields>({
    email: new FormControl<string>('', [Validators.required, Validators.email]),
  });

  constructor() {
    effect(() => {
      const email = this.initialEmail();

      if (!email) {
        return;
      }

      this.forgotPasswordFormGroup.controls['email'].setValue(email);
    });
  }

  submit(): void {
    if (this.forgotPasswordFormGroup.invalid) {
      return;
    }

    const email = this.forgotPasswordFormGroup.controls['email'].value;

    if (!email) {
      return;
    }

    this.submitPasswordReset.emit(email);
  }
}
