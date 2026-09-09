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

  handleError(err: unknown): typeof EMPTY {
    console.error('Error fetching menu:', err);
    this.errorHandler.handleError(err);
    return EMPTY;
  }

  /**
   * Saves the menu, naming the restaurant it belongs to.
   *
   * `restaurantId` is not decoration on the document: it is what the
   * ownership-scoped rules read the write's authority from. A menu holds
   * categories and timestamps and nothing that says who may write it, and rules
   * cannot query for the restaurant pointing at it, so the caller names the
   * restaurant and the rule verifies both that the caller owns it and that its
   * `menuId` is this menu (GitHub issue #1078).
   *
   * A save with no restaurant is refused before it reaches Firestore, where it
   * would be refused as a permission error the user cannot act on.
   */
  async saveMenu(menu: Menu, restaurantId: string | undefined): Promise<void> {
    if (!restaurantId) {
      throw new Error(
        'Cannot save a menu without the restaurant it belongs to',
      );
    }

    await FirebaseFirestore.updateDocument({
      reference: `${MENU_COLLECTION}/${menu.id}`,
      data: {
        restaurantId,
        categories: menu.categories,
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(), // numeric timestamp for easier queries
      },
    });
  }
}
