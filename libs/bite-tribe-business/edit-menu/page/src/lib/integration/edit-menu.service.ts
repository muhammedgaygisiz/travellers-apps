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
}
