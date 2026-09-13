import { inject, Injectable } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Menu } from 'model';
import { NavController } from '@ionic/angular';
import { ToastService } from 'toast';

@Injectable({
  providedIn: 'root',
})
export class EditMenuService {
  private readonly dataAccess = inject(MenuDataAccessService);
  private readonly navController = inject(NavController);
  private readonly toast = inject(ToastService);

  restaurant = this.dataAccess.restaurant;
  menu = this.dataAccess.menu;

  /**
   * Leaves the editor only once the save has landed.
   *
   * A menu save can be refused: the ownership-scoped rules allow it only from
   * the account holding the restaurant (GitHub issue #1078), and the business
   * dashboard still lists every restaurant until issue #1079 scopes it, so an
   * account can reach this editor for a menu it may not write. Navigating back
   * before the write is acknowledged would report success for a change that was
   * thrown away — the same failure the edit-restaurant screen already reports
   * through a toast, which is why the copy is the same.
   */
  async saveMenu(menu: Menu): Promise<void> {
    try {
      await this.dataAccess.saveMenu(menu);
    } catch {
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });

      return;
    }

    this.navController.back();
  }

  /**
   * The currency every price on this menu is stated in (GitHub issue #1102).
   *
   * **Deliberately does not navigate**, which is the whole reason it is not
   * {@link saveMenu}. That one ends an editing session: the owner has finished
   * with the categories and leaving the editor is the acknowledgement. Choosing
   * a currency from the control at the top of the page ends nothing, and
   * routing away from it read as a crash rather than as a save - the owner was
   * put back on the restaurant page having done one thing to a menu they were
   * still editing. The toast is the acknowledgement instead.
   *
   * The reload afterwards is what makes the prices below the control follow it.
   * The editor renders its currency suffix from the stored menu, so without a
   * re-read an owner would choose EUR, be told it was saved, and go on looking
   * at the old symbol on every row.
   */
  async saveCurrency(currency: string): Promise<void> {
    const menuId = this.menu()?.id;

    if (!menuId) {
      return;
    }

    try {
      await this.dataAccess.saveMenuCurrency(menuId, currency);
    } catch {
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });

      return;
    }

    this.dataAccess.retryMenuLoad();

    await this.toast.present({
      messageKey: 'menu-currency-saved',
      outcome: 'success',
    });
  }
}
