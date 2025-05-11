import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
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
    (submitSignupWithApple)="onSignupWithApple()"
    (submitSignupWithFacebook)="onSignupWithFacebook()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginComponent],
})
export class LoginContainerComponent {
  private readonly loginService = inject(LoginService, { optional: true });

  loginFailed = computed(() => {
    if (this.loginService) {
      return this.loginService.loginFailed();
    }

    return false;
  });

  public login(authCreds: Credentials) {
    this.loginService?.login(authCreds);
  }

  public async gotoSignup() {
    await this.loginService?.gotoSignUp();
  }

  onSignupWithGoogle() {
    this.loginService?.loginWithGoogleAccount();
  }

  onSignupWithApple() {
    this.loginService?.loginWithAppleAccount();
  }

  onSignupWithFacebook() {
    this.loginService?.loginWithFacebookAccount();
  }
}
