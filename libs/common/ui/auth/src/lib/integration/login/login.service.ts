import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Credentials } from '../../api/credentials.model';
import { STORE_SERVICE } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private store = inject(STORE_SERVICE);
  private navController = inject(NavController);

  public loginFailed = this.store.loginFailed;

  public login(authCreds: Credentials): void {
    this.store.login(authCreds);
  }

  public async gotoSignUp() {
    await this.navController.navigateForward(['/registration']);
  }

  public loginWithGoogleAccount() {
    this.store.loginWithGoogleAccount();
  }
}
