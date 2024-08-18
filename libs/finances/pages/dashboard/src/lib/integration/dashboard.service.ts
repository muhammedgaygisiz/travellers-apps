import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromBank } from 'finances/store';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  store = inject(Store);

  banks = toSignal(this.store.select(fromBank.banksWithAccounts));

  openAccountDetails(accountNumber: string) {
    console.log(accountNumber);
  }
}
