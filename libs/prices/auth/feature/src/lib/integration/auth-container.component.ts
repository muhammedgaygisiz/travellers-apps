import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { AuthCredentials } from '@travellers-apps/utils-common';

@Component({
  template: `<ta-auth
    class="ion-page"
    [loginFailed]="loginFailed$ | async"
    (submitAuth)="login($event)"
  ></ta-auth>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthContainerComponent {
  loginFailed$: Observable<boolean> = this.authService.loginFailed$;

  // eslint-disable-next-line no-unused-vars
  constructor(private readonly authService: AuthService) {}

  public login(authCreds: AuthCredentials) {
    this.authService.login(authCreds);
  }
}
