import { inject, Injectable } from '@angular/core';
import { AccountStore } from 'finances/account/data-access';
import { Page } from 'pages';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly accountStore = inject(AccountStore);
  private readonly navController = inject(NavController);

  account = this.accountStore.selectedAccount;

  onAddMenuItemClicked() {
    const account = this.account();

    if (account) {
      this.navController.navigateForward([account.number, Page.PAYMENT]);
    }
  }
}
