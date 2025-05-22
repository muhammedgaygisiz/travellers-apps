import { inject, Injectable } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { Menu } from 'model';
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
}
