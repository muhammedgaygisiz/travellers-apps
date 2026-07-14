import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { ForgotPasswordComponent } from '../../components/forgot-password/forgot-password.component';
import { ForgotPasswordService } from './forgot-password.service';

@Component({
  template: ` <ta-forgot-password
    class="ion-page"
    [initialEmail]="initialEmail()"
    [resetRequested]="service.resetRequested()"
    [resetFailed]="service.resetFailed()"
    (submitPasswordReset)="requestPasswordReset($event)"
    (backToLogin)="backToLogin()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForgotPasswordComponent],
})
export class ForgotPasswordContainerComponent {
  private readonly route = inject(ActivatedRoute);
  readonly service = inject(ForgotPasswordService);

  readonly initialEmail = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('email'))),
    { initialValue: null },
  );

  requestPasswordReset(email: string): void {
    void this.service.requestPasswordReset(email);
  }

  backToLogin(): void {
    void this.service.backToLogin();
  }
}
