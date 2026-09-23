import { ErrorHandler, inject, Injectable } from '@angular/core';
import { EMPTY } from 'rxjs';
import { FieldValue, FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import {
  MENU_ITEM_STATS_COLLECTION,
  type Bite,
  type LoadPublicMenuRequest,
  type Menu,
  type MenuItemStats,
  type PublicMenuResult,
} from 'model';
import { getMenuById } from './utils/get-menu-by-id';

export const MENU_COLLECTION = 'menus';

@Injectable({ providedIn: 'root' })
export class MenuApiService {
  private readonly errorHandler = inject(ErrorHandler);

  loadMenu(menuId: string): Promise<Menu | undefined> {
    return getMenuById(menuId);
  }

  /**
   * What people thought of each dish on one restaurant's menu
   * (GitHub issue #1113).
   *
   * The whole subcollection in one read, keyed by menu item id for the
   * template. It is bounded by the dishes a restaurant has written Bites
   * about rather than by the size of the menu, so it is small and usually
   * empty - a `where` per row would be one read per dish for an answer almost
   * every row does not have.
   *
   * A failure is an empty map rather than a rejection. The signal under a dish
   * is worth having and is not worth a menu that does not load: a guest
   * standing in a restaurant wants the prices.
   */
  async loadMenuItemStats(
    restaurantId: string,
  ): Promise<Record<string, MenuItemStats>> {
    if (!restaurantId) {
      return {};
    }

    try {
      const { snapshots } = await FirebaseFirestore.getCollection({
        reference: `restaurants/${restaurantId}/${MENU_ITEM_STATS_COLLECTION}`,
      });

      return Object.fromEntries(
        snapshots
          .map((snapshot) => snapshot.data as MenuItemStats | undefined)
          .filter((stats): stats is MenuItemStats => !!stats?.id)
          .map((stats) => [stats.id, stats]),
      );
    } catch (error) {
      console.error('Error fetching menu item stats:', error);

      return {};
    }
  }

  /**
   * The Bites written about one dish, newest first.
   *
   * Read straight from `bites` rather than through a callable: the rules
   * already admit any member to that collection, and the `where` is an
   * ordinary filter rather than a permission - unlike the collection-group
   * reads of the table epic, where the constraint *is* the authorisation.
   */
  async loadBitesForMenuItem(menuItemId: string, limit = 20): Promise<Bite[]> {
    if (!menuItemId) {
      return [];
    }

    try {
      const { snapshots } = await FirebaseFirestore.getCollection({
        reference: 'bites',
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: 'menuItemId',
              opStr: '==',
              value: menuItemId,
            },
          ],
        },
        queryConstraints: [
          {
            type: 'orderBy',
            fieldPath: 'createdAtTimestamp',
            directionStr: 'desc',
          },
          { type: 'limit', limit },
        ],
      });

      return snapshots
        .map((snapshot) => snapshot.data as Bite | undefined)
        .filter((bite): bite is Bite => !!bite);
    } catch (error) {
      console.error('Error fetching bites for menu item:', error);

      return [];
    }
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
