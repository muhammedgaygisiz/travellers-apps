import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { LoginService } from './login.service';
import { LoginComponent } from '../../components/login/login.component';
import { Credentials } from '../../api/credentials.model';

@Component({
  template: ` <ta-login
    class="ion-page"
    [loginFailed]="loginFailed()"
    (submitAuth)="login($event)"
    (signup)="gotoSignup()"
    (submitSignupWithGoogle)="onSignupWithGoogle()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginComponent],
})
export class LoginContainerComponent {
  private readonly authService = inject(LoginService, { optional: true });

  loginFailed = this.authService?.loginFailed || signal(true);

  public login(authCreds: Credentials) {
    this.authService?.login(authCreds);
  }

  public async gotoSignup() {
    await this.authService?.gotoSignUp();
  }

  onSignupWithGoogle() {
    this.authService?.loginWithGoogleAccount();
  }
}
