import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromAuth } from '@travellers-apps/prices/store/feature';
import { Observable } from 'rxjs';
import { AuthCredentials } from '@travellers-apps/utils-common';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private store = inject(Store);
  private navController = inject(NavController);

  public loginFailed$: Observable<boolean> = this.store.select(
    fromAuth.selectLoginFailed
  );

  public login(authCreds: AuthCredentials): void {
    this.store.dispatch(fromAuth.login({ authCreds }));
  }

  public async gotoSignUp() {
    await this.navController.navigateForward(['/registration']);
  }

  public loginWithGoogleAccount() {
    this.store.dispatch(fromAuth.loginWithGoogleAccount());
  }
}
