import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import {
  selectLoginFailed,
  selectRegistrationErrorCode,
} from './auth/selectors';
import {
  confirmRegistrationErrorMessage,
  login,
  loginWithGoogleAccount,
  register,
} from './auth/actions';
import { StoreService } from 'utils';

interface Login {
  email: string;
  password: string;
}

@Injectable()
export class PricesStoreService implements StoreService {
  private readonly store = inject(Store);

  registrationError = toSignal(this.store.select(selectRegistrationErrorCode), {
    initialValue: '',
  });

  loginFailed = toSignal(this.store.select(selectLoginFailed), {
    initialValue: false,
  });

  register(registration: Login): void {
    this.store.dispatch(register({ registration }));
  }

  confirmError(): void {
    this.store.dispatch(confirmRegistrationErrorMessage());
  }

  login(authCreds: { email: string; password: string }): void {
    this.store.dispatch(login({ authCreds }));
  }

  loginWithGoogleAccount() {
    this.store.dispatch(loginWithGoogleAccount());
  }
}
