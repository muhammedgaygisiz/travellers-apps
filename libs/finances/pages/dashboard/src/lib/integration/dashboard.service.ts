import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { tap } from 'rxjs';
import { DashboardStore } from './dashboard.store';
import { fromBank } from 'finances/store';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  store = inject(Store);
  dashboardStore = inject(DashboardStore);

  banks = toSignal(
    this.store
      .select(fromBank.banksWithAccounts)
      .pipe(tap((banks) => this.dashboardStore.setBanks(banks)))
  );
}
