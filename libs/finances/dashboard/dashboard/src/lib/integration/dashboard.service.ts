import { inject, Injectable } from '@angular/core';
import { NavController } from '@ionic/angular';
import { Page } from 'pages';
import { DashboardDataAccessService } from 'finances/dashboard/data-access';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly dashboardDataAccessService = inject(
    DashboardDataAccessService
  );
  private readonly navController = inject(NavController);

  banks = this.dashboardDataAccessService.banks;

  onAddMenuItemClicked() {
    this.navController.navigateForward([Page.ADD_BANK]);
  }

  onOpenAccountDetails(iban: string) {
    this.navController.navigateForward([Page.ACCOUNT, iban]);
  }
}
