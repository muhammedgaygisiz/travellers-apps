import { inject, Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { banksWithAccounts } from './banks/selectors';
import { accounts } from './accounts/selectors';
import { payments, selectedPayment } from './payments/selectors';
import { ibanFromParams } from './router/selectors';
import { StoreService } from 'utils';
import { fromAuth } from 'ta-firestore';
import { toSignal } from '@angular/core/rxjs-interop';

interface Login {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class FinancesStoreService implements StoreService {
  store = inject(Store);

  registrationError = signal('');

  loginFailed = toSignal(this.store.select(fromAuth.selectLoginFailed), {
    initialValue: false,
  });

  banks$ = this.store.select(banksWithAccounts);
  accounts$ = this.store.select(accounts);

  payments$ = this.store.select(payments);
  selectedPayment$ = this.store.select(selectedPayment);

  iban$ = this.store.select(ibanFromParams);

  loginWithGoogleAccount(): void {
    throw new Error('Method not implemented.');
  }

  login(authCreds: Login): void {
    this.store.dispatch(fromAuth.login({ authCreds }));
  }

  register(registration: Login): void {
    this.store.dispatch(fromAuth.register({ registration }));
  }

  confirmError(): void {
    throw new Error('Method not implemented.');
  }

  logout(): void {
    this.store.dispatch(fromAuth.logout());
  }
}
