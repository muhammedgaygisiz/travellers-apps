import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Page } from 'pages';
import { DashboardStore } from 'finances/dashboard/data-access';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly dashboardStore = inject(DashboardStore);
  private readonly navController = inject(NavController);

  banks = this.dashboardStore.banks;

  onAddMenuItemClicked($event: string) {
    console.log('onAddMenuItemClicked', $event);
    this.navController.navigateForward([Page.ADD_BANK]);
  }
}
