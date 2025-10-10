import { InjectionToken, Signal } from '@angular/core';
import { Login } from './login';

export interface StoreService {
  loginFailed: Signal<boolean>;

  registrationError: Signal<string | null>;

  loginWithGoogleAccount(): void;
  loginWithAppleAccount(): void;

   
  login(authCreds: Login): void;

   
  register(registration: Login): void;

  confirmError(): void;
}

export const STORE_SERVICE = new InjectionToken<StoreService>('store-service');
