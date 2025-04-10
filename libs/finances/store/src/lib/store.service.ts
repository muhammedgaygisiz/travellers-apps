import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { banksWithAccounts } from './banks/selectors';
import { accounts } from './accounts/selectors';
import { payments, selectedPayment } from './payments/selectors';
import { ibanFromParams } from './router/selectors';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  store = inject(Store);

  banks$ = this.store.select(banksWithAccounts);
  accounts$ = this.store.select(accounts);

  payments$ = this.store.select(payments);
  selectedPayment$ = this.store.select(selectedPayment);

  iban$ = this.store.select(ibanFromParams);
}
