import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RegistrationService } from './registration.service';
import { RegistrationComponent } from '../../components/registration/registration.component';
import { Credentials } from '../../api/credentials.model';

@Component({
  template: `
    <ta-registration
      class="ion-page"
      [registrationError]="registrationError()"
      (submitRegistration)="onSubmit($event)"
      (errorConfirm)="onErrorConfirm()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RegistrationComponent],
})
export class RegistrationContainerComponent {
  private readonly service = inject(RegistrationService);

  registrationError = this.service.registrationError;

  onSubmit(registration: Credentials): void {
    this.service.register(registration);
  }

  onErrorConfirm(): void {
    this.service.confirmError();
  }
}
