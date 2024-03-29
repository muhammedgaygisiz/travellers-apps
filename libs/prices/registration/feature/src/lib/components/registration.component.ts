import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { RegistrationFields } from '../api/registration-fields';
import {
  getPasswordValidators,
  passwordMatchValidator,
  PasswordValidatorComponent,
} from '@travellers-apps/prices/password-validator/feature';
import { AuthErrorCode } from '@firebase/auth/dist/node/src/core/errors';
import { ToastController } from '@ionic/angular';
import { AsyncPipe } from '@angular/common';
import { PageComponent } from '@travellers-apps/prices/page/feature';
import { CardComponent } from '@travellers-apps/prices/card/feature';
import {
  IonButton,
  IonInput,
  IonItem,
  IonText,
} from '@ionic/angular/standalone';

@Component({
  standalone: true,
  selector: 'ta-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AsyncPipe,
    PageComponent,
    CardComponent,
    ReactiveFormsModule,
    PasswordValidatorComponent,
    IonItem,
    IonInput,
    IonButton,
    IonText,
  ],
})
export class RegistrationComponent implements OnChanges {
  @Input()
  public registrationError: string | null = '';

  @Output()
  public submitRegistration: EventEmitter<AuthCredentials> = new EventEmitter();

  @Output()
  public errorConfirm: EventEmitter<void> = new EventEmitter();

  private readonly toastController = inject(ToastController);

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
    {
      validators: passwordMatchValidator,
      updateOn: 'change',
    }
  );

  public async ngOnChanges(changes: SimpleChanges): Promise<void> {
    const receivedRegistrationError = changes['registrationError'].currentValue;
    if (receivedRegistrationError?.indexOf(AuthErrorCode.EMAIL_EXISTS) > -1) {
      await this.showRegistrationErrorMessage();
    }
  }

  private async showRegistrationErrorMessage() {
    const toast = await this.toastController.create({
      message: 'Email already in use.',
      position: 'bottom',
      buttons: [
        {
          text: 'OK',
          role: 'confirm',
          handler: this.onConfirmToast.bind(this),
        },
      ],
    });

    await toast.present();
  }

  private onConfirmToast() {
    this.errorConfirm.emit();
  }
}
