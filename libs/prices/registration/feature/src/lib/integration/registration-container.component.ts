import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  private readonly registrationService = inject(RegistrationService);

  public registrationError$ = this.registrationService.errorCode$;

  onSubmit(registration: AuthCredentials) {
    this.registrationService.register(registration);
  }

  onErrorConfirm() {
    this.registrationService.confirmError();
  }
}
