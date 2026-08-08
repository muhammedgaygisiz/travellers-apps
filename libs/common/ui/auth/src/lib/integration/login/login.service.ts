import { computed, inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Credentials } from '../../api/credentials.model';
import { STORE_SERVICE } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class LoginService {
  private store = inject(STORE_SERVICE, { optional: true });
  private navController = inject(NavController);

  public loginFailed = computed(() => {
    if (this.store) {
      return this.store.loginFailed();
    }

    return true;
  });

  /** Whether a sign-in round-trip is still running (issue #1273). */
  public loginPending = computed(() => {
    if (this.store) {
      return this.store.loginPending();
    }

    return false;
  });

  public login(authCreds: Credentials): void {
    // The disabled button already blocks this, but a queued tap can still land
    // between the click and the pending flag turning on.
    if (this.loginPending()) {
      return;
    }

    this.store?.login(authCreds);
  }

  public async gotoSignUp(): Promise<void> {
    await this.navController.navigateForward(['/registration']);
  }

  public async gotoForgotPassword(email: string | null): Promise<void> {
    const trimmedEmail = email?.trim();

    await this.navController.navigateForward(
      ['/forgot-password'],
      trimmedEmail ? { queryParams: { email: trimmedEmail } } : undefined,
    );
  }

  public loginWithGoogleAccount(): void {
    if (this.loginPending()) {
      return;
    }

    this.store?.loginWithGoogleAccount();
  }

  public loginWithAppleAccount(): void {
    if (this.loginPending()) {
      return;
    }

    this.store?.loginWithAppleAccount();
  }
}
