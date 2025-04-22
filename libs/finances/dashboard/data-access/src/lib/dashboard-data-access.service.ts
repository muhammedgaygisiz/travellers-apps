import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FinancesStoreService } from 'finances/store';

@Injectable({
  providedIn: 'root',
})
export class DashboardDataAccessService {
  private readonly storeService = inject(FinancesStoreService);

  banks = toSignal(this.storeService.banks$, { initialValue: [] });

  logout() {
    this.storeService.logout();
  }
}
