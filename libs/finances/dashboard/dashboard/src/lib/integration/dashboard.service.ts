import { inject, Injectable, Signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Page } from 'pages';
import { DashboardDataAccessService } from 'finances/dashboard/data-access';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly service = inject(DashboardDataAccessService);
  private readonly navController = inject(NavController);

  banks = this.service.banks as Signal<any>;

  onAddMenuItemClicked() {
    this.navController.navigateForward([Page.ADD_BANK]);
  }

  onOpenAccountDetails(iban: string) {
    this.navController.navigateForward([Page.ACCOUNT, iban]);
  }

  onLogoutClicked() {
    this.service.logout();
  }
}
