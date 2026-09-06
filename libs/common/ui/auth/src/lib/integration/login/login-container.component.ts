import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { LoginService } from './login.service';
import { LoginComponent } from '../../components/login/login.component';
import { Credentials } from '../../api/credentials.model';
import { Router } from '@angular/router';
import { REGISTRATION_PATH } from '../../routes';

@Component({
  template: ` <ta-login
    class="ion-page"
    [loginFailed]="loginFailed()"
    [pending]="pending()"
    [showSignUp]="showSignUp"
    (submitAuth)="login($event)"
    (signup)="gotoSignup()"
    (forgotPassword)="gotoForgotPassword($event)"
    (submitLoginWithGoogle)="onLoginWithGoogle()"
    (submitLoginWithApple)="onLoginWithApple()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LoginComponent],
})
export class LoginContainerComponent {
  private readonly loginService = inject(LoginService, { optional: true });

  /**
   * Offer Sign Up only where the registration route actually exists.
   *
   * Asking the router rather than carrying a second flag is what keeps the
   * button and the routing from disagreeing: an app that dropped the route
   * through `withAuthRoutes({ registration: false })` cannot advertise a page
   * that would 404, and nobody has to remember to turn off two things
   * (issue #1469).
   */
  readonly showSignUp = inject(Router).config.some(
    (route) => route.path === REGISTRATION_PATH,
  );

  loginFailed = computed(() => {
    if (this.loginService) {
      return this.loginService.loginFailed();
    }

    return false;
  });

  pending = computed(() => {
    if (this.loginService) {
      return this.loginService.loginPending();
    }

    return false;
  });

  public login(authCreds: Credentials): void {
    this.loginService?.login(authCreds);
  }

  public async gotoSignup(): Promise<void> {
    await this.loginService?.gotoSignUp();
  }

  public async gotoForgotPassword(email: string | null): Promise<void> {
    await this.loginService?.gotoForgotPassword(email);
  }

  onLoginWithGoogle(): void {
    this.loginService?.loginWithGoogleAccount();
  }

  onLoginWithApple(): void {
    this.loginService?.loginWithAppleAccount();
  }
}
