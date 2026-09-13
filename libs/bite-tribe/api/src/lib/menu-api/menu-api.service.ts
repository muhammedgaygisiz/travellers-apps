import { ErrorHandler, inject, Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import { FieldValue, FirebaseFirestore } from '@capacitor-firebase/firestore';
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
   * The currency every price on this menu is stated in (GitHub issue #1102).
   *
   * A write of its own rather than another field on {@link saveMenu}, and the
   * two are genuinely different edits. `saveMenu` replaces the categories an
   * owner has been rearranging; the currency is one value chosen from a control
   * above them. Folding it into `saveMenu` would send a whole categories array
   * along with a currency change - overwriting item edits that were still open
   * - and would send a possibly stale currency along with every category save.
   *
   * `restaurantId` travels for the reason it does on `saveMenu`: it is what the
   * ownership-scoped rules read the write's authority from, and `updateDocument`
   * merges, so the rule sees it on the resulting document (issue #1078).
   *
   * **Unsetting removes the field rather than storing an empty string.**
   * `Menu.currency` reads a missing field as "not stated", and an empty string
   * would be a second way of saying the same thing that every reader would then
   * have to know about. `FieldValue.delete()` is the Capacitor plugin's own
   * marker - a plain `{ __type__: 'delete' }` object that survives the native
   * bridge, unlike the web SDK's `deleteField()` sentinel, which does not.
   */
  async saveMenuCurrency(
    menuId: string,
    restaurantId: string | undefined,
    currency: string,
  ): Promise<void> {
    if (!restaurantId) {
      throw new Error(
        'Cannot save a menu without the restaurant it belongs to',
      );
    }

    await FirebaseFirestore.updateDocument({
      reference: `${MENU_COLLECTION}/${menuId}`,
      data: {
        restaurantId,
        currency: currency || FieldValue.delete(),
        updatedAt: new Date().toISOString(),
        updatedAtTimestamp: Date.now(),
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
