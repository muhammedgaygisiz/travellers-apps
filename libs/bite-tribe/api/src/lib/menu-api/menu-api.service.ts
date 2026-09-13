import { ErrorHandler, inject, Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import type { LoadPublicMenuRequest, Menu, PublicMenuResult } from 'model';
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

  /**
   * A restaurant's menu, read without an account (GitHub issue #1102).
   *
   * A callable rather than a Firestore read, because a public menu page needs
   * the restaurant's name too and `/restaurants/{id}` carries ownership and
   * ordering configuration a guest is not entitled to. The backend assembles
   * both halves field by field.
   *
   * A refusal comes back as a resolved value, like a refused scan: a restaurant
   * that has not written a menu is not an error, and the reader is owed a
   * sentence rather than an apology.
   */
  async loadPublicMenu(
    restaurantId: string,
  ): Promise<PublicMenuResult | undefined> {
    try {
      const result = await FirebaseFunctions.callByName<
        LoadPublicMenuRequest,
        PublicMenuResult
      >({ name: 'loadPublicMenu', data: { restaurantId } });

      return result.data;
    } catch {
      // The transport failed rather than the menu being unreadable, and the
      // two get different sentences. `undefined` is the caller's signal to say
      // so rather than to blame the restaurant.
      return undefined;
    }
  }
}
