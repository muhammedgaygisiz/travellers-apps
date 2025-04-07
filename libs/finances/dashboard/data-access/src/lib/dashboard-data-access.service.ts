import { inject, Injectable } from '@angular/core';
import { DashboardStore } from './dashboard.store';

@Injectable({ providedIn: 'root' })
export class DashboardDataAccessService {
  private readonly dashboardStore = inject(DashboardStore);

  banks = this.dashboardStore.banks;
}
