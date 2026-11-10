import { inject, Injectable } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Menu } from 'model';
import { LoadingController } from '@ionic/angular/standalone';
import { TranslocoService } from '@jsverse/transloco';
import { ToastService } from 'toast';

@Injectable({
  providedIn: 'root',
})
export class EditMenuService {
  private readonly dataAccess = inject(MenuDataAccessService);
  private readonly loadingController = inject(LoadingController);
  private readonly transloco = inject(TranslocoService);
  private readonly toast = inject(ToastService);

  restaurant = this.dataAccess.restaurant;
  menu = this.dataAccess.menu;

  /**
   * Saves the menu and keeps the owner in the editor (issue #1377).
   *
   * The same feedback a Bite gets when it is created: a loading overlay while
   * the write is in flight, then a toast saying how it ended. A save used to
   * leave the editor as its acknowledgement, which put the owner back on the
   * restaurant page after every change - one category title, one price - when
   * they were usually in the middle of working through the whole menu.
   *
   * The overlay is modal on purpose. A second edit started while the first is
   * still being written would be saved from a menu that does not hold the
   * first one yet.
   *
   * On success the menu is read again. That is what tells the editor the save
   * landed: a field whose edit now matches the stored menu is no longer an
   * edit, so its Save and Cancel go away, while an edit somewhere else that was
   * not part of this save keeps them. A refused save changes nothing stored, so
   * the owner's edit and its buttons stay for another try.
   *
   * A save can be refused: the ownership-scoped rules allow it only from the
   * account holding the restaurant (GitHub issue #1078).
   */
  async saveMenu(menu: Menu): Promise<void> {
    const loading = await this.loadingController.create({
      message: this.transloco.translate('menu-saving'),
      backdropDismiss: false,
    });
    await loading.present();

    try {
      await this.dataAccess.saveMenu(menu);
    } catch {
      await loading.dismiss();
      await this.toast.present({
        messageKey: 'something-went-wrong-please-try-again',
        outcome: 'failure',
      });

      return;
    }

    await loading.dismiss();
    this.dataAccess.retryMenuLoad();

    await this.toast.present({
      messageKey: 'menu-saved',
      outcome: 'success',
    });
  }

  /**
   * The currency every price on this menu is stated in (GitHub issue #1102).
   *
   * Its own write rather than a {@link saveMenu} of the whole menu, so that
   * choosing a currency does not also write back every category the editor
   * happens to hold. Like a menu save it does not navigate: routing away from
   * it read as a crash rather than as a save, which is the same lesson
   * {@link saveMenu} later learned (issue #1377). The toast is the
   * acknowledgement.
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
