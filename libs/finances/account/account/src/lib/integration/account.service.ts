import { inject, Injectable } from '@angular/core';
import { AccountStore } from 'finances/account/data-access';
import { Page } from 'pages';
import { NavController } from '@ionic/angular';

@Injectable({ providedIn: 'root' })
export class AccountService {
  store = inject(AccountStore);

  private readonly navController = inject(NavController);

  onAddMenuItemClicked() {
    const account = this.store.account();

    if (account) {
      this.navController.navigateForward([account.number, Page.PAYMENT]);
    }
  }
}
