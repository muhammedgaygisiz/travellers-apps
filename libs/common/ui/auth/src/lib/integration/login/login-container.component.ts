import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
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
  private readonly authService = inject(LoginService);

  loginFailed = this.authService.loginFailed;

  public login(authCreds: Credentials) {
    this.authService.login(authCreds);
  }

  public async gotoSignup() {
    await this.authService.gotoSignUp();
  }

  onSignupWithGoogle() {
    this.authService.loginWithGoogleAccount();
  }
}
