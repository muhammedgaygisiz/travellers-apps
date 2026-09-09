import { inject, Injectable } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Bite, Menu, MenuItem } from 'model';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  dataAccess = inject(MenuDataAccessService);
  private readonly navController = inject(NavController);

  bite = this.dataAccess.bite;
  restaurant = this.dataAccess.restaurant;
  menu = this.dataAccess.menu;
  isMenuLoading = this.dataAccess.isMenuLoading;
  isMenuUnavailable = this.dataAccess.isMenuUnavailable;

  /**
   * Leaves the menu only once the save has landed. A menu save can be refused
   * by the ownership-scoped rules (issue #1078), and navigating back on a
   * refusal would report success for a change that was thrown away.
   */
  async saveMenu(menu: Menu): Promise<void> {
    await this.dataAccess.saveMenu(menu);

    this.navController.back();
  }

  /**
   * Reads the menu again after a failed read, which is worth offering because a
   * failure says nothing about the menu itself - a timeout or an offline device
   * leaves it perfectly intact. See GitHub issue #1382.
   */
  retryMenuLoad(): void {
    this.dataAccess.retryMenuLoad();
  }

  /** Leaves a menu that cannot be shown, rather than stranding the user on it. */
  goBack(): void {
    this.navController.back();
  }

  prepareBiteFromMenuItem(menuItem: MenuItem): void {
    const restaurant = this.restaurant();

    // TODO: Take currency from menu item when available
    const biteToBeCreated: Partial<Bite> = {
      currency: 'EUR',
      name: menuItem.name,
      place: restaurant?.name || '',
      position: restaurant?.position || { latitude: 0, longitude: 0 },
      price: menuItem.price,
      userId: '',
      restaurantId: restaurant?.id,
    };

    this.dataAccess.prepareBiteFromMenuItem(biteToBeCreated);

    this.navController.navigateForward(['new-bite']);
  }
}
