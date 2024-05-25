import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { AuthComponent } from '../components/auth.component';
import { AuthCredentials } from '../api/auth-credentials.model';

@Component({
  standalone: true,
  template: ` <ta-auth
    class="ion-page"
    [loginFailed]="loginFailed$ | async"
    (submitAuth)="login($event)"
    (signup)="gotoSignup()"
    (submitSignupWithGoogle)="onSignupWithGoogle()"
  />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AsyncPipe, AuthComponent],
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
