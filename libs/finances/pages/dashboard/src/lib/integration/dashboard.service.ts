import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { tap } from 'rxjs';
import { DashboardStore } from './dashboard.store';
import { fromBank } from 'finances/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavController } from '@ionic/angular';
import { Page } from 'pages';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  store = inject(Store);
  dashboardStore = inject(DashboardStore);
  private readonly navController = inject(NavController);

  banks = toSignal(
    this.store
      .select(fromBank.banksWithAccounts)
      .pipe(tap((banks) => this.dashboardStore.setBanks(banks)))
  );

  onAddMenuItemClicked($event: string) {
    console.log('onAddMenuItemClicked', $event);
    this.navController.navigateForward([Page.ADD_BANK]);
  }
}
