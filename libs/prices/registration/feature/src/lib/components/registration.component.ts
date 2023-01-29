import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
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
import { IonicModule, ToastController } from '@ionic/angular';
import { AsyncPipe, NgIf } from '@angular/common';
import { PageComponent } from '@travellers-apps/prices/page/feature';
import { CardComponent } from '@travellers-apps/prices/card/feature';

@Component({
  standalone: true,
  selector: 'ta-registration',
  templateUrl: './registration.component.html',
  styleUrls: ['./registration.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIf,
    AsyncPipe,
    PageComponent,
    CardComponent,
    IonicModule,
    ReactiveFormsModule,
    PasswordValidatorComponent,
  ],
})
export class RegistrationComponent implements OnChanges {
  @Input()
  public registrationError: string | null = '';

  @Output()
  public submitRegistration: EventEmitter<AuthCredentials> = new EventEmitter();

  @Output()
  public errorConfirm: EventEmitter<void> = new EventEmitter();

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly toastController: ToastController
  ) {}

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
