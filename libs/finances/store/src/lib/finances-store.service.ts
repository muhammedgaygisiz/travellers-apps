import { inject, Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { banksWithAccounts } from './banks/selectors';
import { accounts } from './accounts/selectors';
import { payments, selectedPayment } from './payments/selectors';
import { saveNewPayment, savePayment } from './payments/actions';
import { ibanFromParams } from './router/selectors';
import { StoreService, Login } from 'utils';
import { fromAuth } from 'ta-firestore';
import { toSignal } from '@angular/core/rxjs-interop';

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

  loginWithAppleAccount(): void {
    throw new Error('Method not implemented.');
  }

  loginWithFacebookAccount(): void {
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

  saveNewPayment(payment: { amount: number; iban: any }): void {
    this.store.dispatch(saveNewPayment({ payment }));
  }

  async savePayment(payment: any, id: string | undefined): Promise<void> {
    if (id) {
      this.store.dispatch(savePayment({ payment, id }));
    }
  }

  save(entity: any, docType: string): void {
    throw new Error('Method not implemented.');
  }
}
