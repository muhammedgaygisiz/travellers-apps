import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { RegistrationService } from './registration.service';

@Component({
  template: `
    <ta-registration
      class="ion-page"
      [registrationError]="registrationError$ | async"
      (submitRegistration)="onSubmit($event)"
      (errorConfirm)="onErrorConfirm()"
    >
    </ta-registration>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationContainerComponent {
  public registrationError$ = this.registrationService.errorCode$;

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly registrationService: RegistrationService
  ) {}

  onSubmit(registration: AuthCredentials) {
    this.registrationService.register(registration);
  }

  onErrorConfirm() {
    this.registrationService.confirmError();
  }
}
