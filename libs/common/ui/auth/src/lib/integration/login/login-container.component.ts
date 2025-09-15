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

  public login(authCreds: Credentials): void {
    this.loginService?.login(authCreds);
  }

  public async gotoSignup(): Promise<void> {
    await this.loginService?.gotoSignUp();
  }

  onSignupWithGoogle(): void {
    this.loginService?.loginWithGoogleAccount();
  }

  onSignupWithApple(): void {
    this.loginService?.loginWithAppleAccount();
  }

  onSignupWithFacebook(): void {
    this.loginService?.loginWithFacebookAccount();
  }
}
