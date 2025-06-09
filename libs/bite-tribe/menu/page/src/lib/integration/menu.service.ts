import { inject, Injectable } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { Bite, Menu, MenuItem } from 'model';
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

  saveMenu(menu: Menu) {
    this.dataAccess.saveMenu(menu);

    this.navController.back();
  }

  prepareBiteFromMenuItem(menuItem: MenuItem) {
    const restaurant = this.restaurant();

    // TODO: Take currency from menu item when available
    const biteToBeCreated: Partial<Bite> = {
      currency: 'EUR',
      image: '',
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
