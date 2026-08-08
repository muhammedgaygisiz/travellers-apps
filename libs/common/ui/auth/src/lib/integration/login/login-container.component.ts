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
    [pending]="pending()"
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
