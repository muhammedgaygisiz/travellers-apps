import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { banksWithAccounts } from './banks/selectors';

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  store = inject(Store);

  banks$ = this.store.select(banksWithAccounts);
}
