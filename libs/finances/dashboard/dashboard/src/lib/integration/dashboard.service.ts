import { inject, Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { NavController } from '@ionic/angular';
import { Page } from 'pages';
import { DashboardStore } from 'data-access';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  store = inject(Store);
  dashboardStore = inject(DashboardStore);
  private readonly navController = inject(NavController);

  banks = this.dashboardStore.banks;

  onAddMenuItemClicked($event: string) {
    console.log('onAddMenuItemClicked', $event);
    this.navController.navigateForward([Page.ADD_BANK]);
  }
}
