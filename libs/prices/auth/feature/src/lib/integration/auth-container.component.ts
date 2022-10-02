import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AuthCredentials } from '../api/auth-credentials';
import { AuthService } from './auth.service';

@Component({
  template: ` <ta-auth class="ion-page" (submitAuth)="log($event)"></ta-auth> `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthContainerComponent {
  // eslint-disable-next-line no-unused-vars
  constructor(private readonly authService: AuthService) {}

  public log(event: AuthCredentials) {
    this.authService.login(event);
  }
}
