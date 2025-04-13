import { inject, Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { banksWithAccounts } from './banks/selectors';
import { accounts } from './accounts/selectors';
import { payments, selectedPayment } from './payments/selectors';
import { ibanFromParams } from './router/selectors';
import { StoreService } from 'utils';

interface Login {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class FinancesStoreService implements StoreService {
  store = inject(Store);

  loginFailed = signal(false);
  registrationError = signal('');

  banks$ = this.store.select(banksWithAccounts);
  accounts$ = this.store.select(accounts);

  payments$ = this.store.select(payments);
  selectedPayment$ = this.store.select(selectedPayment);

  iban$ = this.store.select(ibanFromParams);

  loginWithGoogleAccount(): void {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars
  login(authCreds: Login): void {
    // throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line no-unused-vars
  register(registration: Login): void {
    // this.store.dispatch(register({ registration }));
  }

  confirmError(): void {
    // this.store.dispatch(confirmRegistrationErrorMessage());
  }
}
