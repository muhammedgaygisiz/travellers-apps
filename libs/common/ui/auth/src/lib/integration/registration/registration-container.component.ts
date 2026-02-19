import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RegistrationService } from './registration.service';
import { RegistrationComponent } from '../../components/registration/registration.component';
import { Credentials } from '../../api/credentials.model';

@Component({
  template: `
    <ta-registration class="ion-page" (submitRegistration)="onSubmit($event)" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RegistrationComponent],
})
export class RegistrationContainerComponent {
  readonly service = inject(RegistrationService);

  onSubmit(registration: Credentials): void {
    this.service.register(registration);
  }
}
