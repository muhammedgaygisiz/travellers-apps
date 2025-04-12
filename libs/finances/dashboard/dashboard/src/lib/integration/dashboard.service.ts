import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Page } from 'pages';
import { DashboardStore } from 'finances/dashboard/data-access';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  store = inject(DashboardStore);

  private readonly navController = inject(NavController);

  onAddMenuItemClicked() {
    this.navController.navigateForward([Page.ADD_BANK]);
  }

  onOpenAccountDetails(iban: string) {
    this.navController.navigateForward([Page.ACCOUNT, iban]);
  }
}
