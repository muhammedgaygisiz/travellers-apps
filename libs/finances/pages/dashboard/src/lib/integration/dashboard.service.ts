import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { tap } from 'rxjs';
import { DashboardStore } from './dashboard.store';
import { fromBank } from 'finances/store';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  store = inject(Store);
  dashboardStore = inject(DashboardStore);

  banks$ = this.store
    .select(fromBank.banksWithAccounts)
    .pipe(tap((banks) => this.dashboardStore.setBanks(banks)));
}
