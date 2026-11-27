import { computed, inject, Injectable, Signal } from '@angular/core';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { dietaryVoteScopeKey, menuDietaryLabelsOf, withMenuIds } from 'model';
import type {
  Bite,
  DietaryLabelTallies,
  DietaryOwnVotes,
  LinkBiteToMenuItemRequest,
  LinkBiteToMenuItemResult,
  Menu,
  MenuItemStats,
  SaveMenuDietaryLabelsResult,
  VoteDietaryLabelRequest,
  VoteDietaryLabelResult,
} from 'model';
import type { Observable } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { createEntityId } from 'utils';

@Injectable({
  providedIn: 'root',
})
export class MenuDataAccessService {
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly api = inject(BiteTribeApiService);

  bite = toSignal(this.storeService.bite$);
  restaurant = toSignal(this.storeService.restaurant$);
  userId = toSignal(this.storeService.userId$, { initialValue: '' });
  isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  private readonly storedMenu = toSignal(this.storeService.menu$);

  /**
   * The route's menu, with an id on every category, item and variant.
   *
   * Menus written before issue #1099 carry none, and the admin backfill closes
   * that for the collection at rest - but only once an operator has pressed it,
   * and only for menus that existed when they did. Filling in what is missing
   * on read means the editor is keying by id from the first render either way,
   * and the ids it generated are persisted by the owner's next save.
   *
   * `withMenuIds` returns the menu it was given when nothing was missing, so a
   * menu that has been backfilled passes through by identity and the
   * `linkedSignal` chain the editor is built on is not restarted on every read.
   */
  menu: Signal<Menu | undefined> = computed(() => {
    const stored = this.storedMenu();

    return stored ? withMenuIds(stored, createEntityId) : stored;
  });

  /** True while the route's menu has neither arrived nor been given up on. */
  isMenuLoading = toSignal(this.storeService.isMenuLoading$, {
    initialValue: true,
  });

  /** True once the read settled and there is no menu to show (#1382). */
  isMenuUnavailable = toSignal(this.storeService.isMenuUnavailable$, {
    initialValue: false,
  });

  /**
   * The restaurant comes from the **route parameter**, not from the loaded
   * restaurant. Both menu routes carry `:restaurantId`, so the parameter is
   * always there; `restaurant` is only there once the restaurants have loaded.
   * Until issue #1653 it was also `undefined` whenever there was no GPS
   * position, and reading the id off it failed the save for anyone who had
   * declined the location permission. The rules that authorise the write read
   * this id (issue #1078), so the route stays the source either way.
   */
  async saveMenu(menu: Menu): Promise<SaveMenuDietaryLabelsResult> {
    const restaurantId = this.storeService.restaurantIdFromUrl();

    await this.api.saveMenu(menu, restaurantId);

    // The labels go second, through the callable, once the dishes they name
    // are stored (issue #2198). The menu write carries none of them.
    return this.api.saveMenuDietaryLabels({
      restaurantId: restaurantId ?? '',
      items: menuDietaryLabelsOf(menu),
    });
  }

  /**
   * The currency this menu's prices are stated in (GitHub issue #1102).
   *
   * Takes the restaurant off the route for the same reason {@link saveMenu}
   * does, and an empty `currency` means "not stated" - the field is removed
   * rather than emptied.
   */
  saveMenuCurrency(menuId: string, currency: string): Promise<void> {
    return this.api.saveMenuCurrency(
      menuId,
      this.storeService.restaurantIdFromUrl(),
      currency,
    );
  }

  /**
   * The owner takes a menu built from guests' Bites as their own (GitHub
   * issue #2214). The restaurant comes off the route, as for {@link saveMenu}.
   */
  confirmMenuAsOwn(menuId: string): Promise<void> {
    return this.api.confirmMenuAsOwn(
      menuId,
      this.storeService.restaurantIdFromUrl(),
    );
  }

  /**
   * Records that the account holding the route's restaurant saved its menu
   * (GitHub issue #2126), which ticks "Menu reviewed" on the business
   * dashboard. Called by the business menu editor only.
   */
  async markMenuReviewed(): Promise<void> {
    const restaurantId = this.storeService.restaurantIdFromUrl();

    if (restaurantId) {
      await this.api.markMenuReviewed(restaurantId);
    }
  }

  retryMenuLoad(): void {
    this.storeService.retryMenuLoad();
  }

  prepareBiteFromMenuItem(biteToBeCreated: Partial<Bite>): void {
    this.storeService.cacheBite(biteToBeCreated);
  }

  /** What people thought of each dish on one menu (GitHub issue #1113). */
  loadMenuItemStats(
    restaurantId: string,
  ): Promise<Record<string, MenuItemStats>> {
    return this.api.loadMenuItemStats(restaurantId);
  }

  /**
   * The dietary label counts of a restaurant's dishes, by menu item id, live
   * (GitHub issue #2197).
   */
  dietaryLabelTallies$(
    restaurantId: string,
  ): Observable<Record<string, DietaryLabelTallies>> {
    return this.api.dietaryLabelTallies$(
      dietaryVoteScopeKey({ type: 'menuItem', restaurantId, menuItemId: '' }),
    );
  }

  /** The signed-in member's own votes on a restaurant's dishes, by id. */
  loadOwnDietaryVotes(
    restaurantId: string,
  ): Promise<Record<string, DietaryOwnVotes>> {
    const uid = this.userId();

    return uid
      ? this.api.loadOwnDietaryVotes(
          dietaryVoteScopeKey({
            type: 'menuItem',
            restaurantId,
            menuItemId: '',
          }),
          uid,
        )
      : Promise.resolve({});
  }

  /** Confirms or disputes a dish's label through `voteDietaryLabel`. */
  voteDietaryLabel(
    request: VoteDietaryLabelRequest,
  ): Promise<VoteDietaryLabelResult> {
    return this.api.voteDietaryLabel(request);
  }

  /** The Bites written about one dish, newest first. */
  /**
   * Every Bite about the route's restaurant, newest first (GitHub issue
   * #2216), for the business app's Guest Bites page.
   */
  loadBitesForRestaurant(): Promise<Bite[]> {
    return this.api.loadBitesForRestaurant(
      this.storeService.restaurantIdFromUrl() ?? '',
    );
  }

  /** An owner's link between a guest's Bite and a dish (issue #2216). */
  linkBiteToMenuItem(
    request: LinkBiteToMenuItemRequest,
  ): Promise<LinkBiteToMenuItemResult> {
    return this.api.linkBiteToMenuItem(request);
  }

  loadBitesForMenuItem(menuItemId: string): Promise<Bite[]> {
    return this.api.loadBitesForMenuItem(menuItemId);
  }
}
