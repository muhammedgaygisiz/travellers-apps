import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RegistrationService } from './registration.service';
import { AsyncPipe } from '@angular/common';
import { RegistrationComponent } from '../../components/registration/registration.component';
import { Credentials } from '../../api/credentials.model';

@Component({
  template: `
    <ta-registration
      class="ion-page"
      [registrationError]="registrationError$ | async"
      (submitRegistration)="onSubmit($event)"
      (errorConfirm)="onErrorConfirm()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RegistrationComponent, AsyncPipe],
})
export class RegistrationContainerComponent {
  private readonly registrationService = inject(RegistrationService);

  public registrationError$ = this.registrationService.errorCode$;

  onSubmit(registration: Credentials): void {
    this.registrationService.register(registration);
  }

  onErrorConfirm() {
    this.registrationService.confirmError();
  }
}
