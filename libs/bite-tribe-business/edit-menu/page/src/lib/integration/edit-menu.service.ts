import { inject, Injectable } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Menu } from 'model';
import { NavController } from '@ionic/angular';

@Injectable({
  providedIn: 'root',
})
export class EditMenuService {
  private readonly dataAccess = inject(MenuDataAccessService);
  private readonly navController = inject(NavController);

  restaurant = this.dataAccess.restaurant;
  menu = this.dataAccess.menu;

  saveMenu(menu: Menu): void {
    this.dataAccess.saveMenu(menu);

    this.navController.back();
  }
}
