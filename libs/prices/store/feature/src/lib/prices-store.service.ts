import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { selectLoginFailed } from './auth/selectors';
import { login, loginWithGoogleAccount } from './auth/actions';
import { StoreService } from 'utils';

@Injectable()
export class PricesStoreService implements StoreService {
  private readonly store = inject(Store);

  loginFailed = toSignal(this.store.select(selectLoginFailed), {
    initialValue: false,
  });

  login(authCreds: { email: string; password: string }): void {
    this.store.dispatch(login({ authCreds }));
  }

  loginWithGoogleAccount() {
    this.store.dispatch(loginWithGoogleAccount());
  }
}
