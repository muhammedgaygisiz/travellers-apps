import { ErrorHandler, inject, Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import type { Menu } from 'model';
import { getMenuById } from './utils/get-menu-by-id';

export const MENU_COLLECTION = 'menus';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly errorHandler = inject(ErrorHandler);

  loadMenu(menuId: string): Promise<Menu | undefined> {
    return getMenuById(menuId);
  }

  handleError(err: any): typeof EMPTY {
    console.error('Error fetching menu:', err);
    this.errorHandler.handleError(err);
    return EMPTY;
  }

  async saveMenu(menu: Menu): Promise<void> {
    await FirebaseFirestore.updateDocument({
      reference: `${MENU_COLLECTION}/${menu.id}`,
      data: {
        categories: menu.categories,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });
  }
}
