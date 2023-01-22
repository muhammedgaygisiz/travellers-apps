import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { AuthCredentials } from '@travellers-apps/utils-common';

@Component({
  template: `<ta-auth
    class="ion-page"
    [loginFailed]="loginFailed$ | async"
    (submitAuth)="login($event)"
    (signup)="gotoSignup()"
    (submitSignupWithGoogle)="onSignupWithGoogle()"
  ></ta-auth>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthContainerComponent {
  private readonly authService = inject(AuthService);

  loginFailed$: Observable<boolean> = this.authService.loginFailed$;

  public login(authCreds: AuthCredentials) {
    this.authService.login(authCreds);
  }

  public async gotoSignup() {
    await this.authService.gotoSignUp();
  }

  onSignupWithGoogle() {
    this.authService.loginWithGoogleAccount();
  }
}
