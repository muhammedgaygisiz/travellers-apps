import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { LoginService } from './login.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { LoginComponent } from '../../components/login/login.component';
import { Credentials } from '../../api/credentials.model';

@Component({
  template: ` <ta-login
    class="ion-page"
    [loginFailed]="loginFailed$ | async"
    (submitAuth)="login($event)"
    (signup)="gotoSignup()"
    (submitSignupWithGoogle)="onSignupWithGoogle()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, LoginComponent],
})
export class LoginContainerComponent {
  private readonly authService = inject(LoginService);

  loginFailed$: Observable<boolean> = this.authService.loginFailed$;

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
