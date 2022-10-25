import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { RegistrationService } from './registration.service';

@Component({
  template: `
    <ta-registration class="ion-page" (submitRegistration)="onSubmit($event)">
    </ta-registration>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegistrationContainerComponent {
  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly registrationService: RegistrationService
  ) {}

  onSubmit(registration: AuthCredentials) {
    this.registrationService.register(registration);
  }
}
