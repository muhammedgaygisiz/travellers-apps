import { InjectionToken, Signal } from '@angular/core';

interface Login {
  email: string;
  password: string;
}

export interface StoreService {
  loginFailed: Signal<boolean>

  loginWithGoogleAccount(): void;
  // eslint-disable-next-line no-unused-vars
  login(authCreds: Login): void;
}

export const STORE_SERVICE = new InjectionToken<StoreService>('store-service');
