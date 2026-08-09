import { InjectionToken, Signal } from '@angular/core';
import { Login } from './login';

export interface StoreService {
  loginFailed: Signal<boolean>;

  /** Whether a sign-in round-trip is still running (issue #1273). */
  loginPending: Signal<boolean>;

  loginWithGoogleAccount(): void;
  loginWithAppleAccount(): void;

  login(authCreds: Login): void;
}

export const STORE_SERVICE = new InjectionToken<StoreService>('store-service');
