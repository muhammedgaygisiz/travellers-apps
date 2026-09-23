import { computed, inject, Injectable, signal } from '@angular/core';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import type { Bite, Menu, MenuItem, MenuItemStats } from 'model';
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

  private readonly itemStats = signal<Record<string, MenuItemStats>>({});
  private readonly dishBites = signal<Bite[]>([]);
  private readonly openDish = signal<MenuItem | undefined>(undefined);
  private readonly loadingBites = signal(false);

  /** What people thought of each dish, keyed by menu item id (issue #1113). */
  readonly stats = computed(() => this.itemStats());

  /** The dish whose Bites are open, or nothing. */
  readonly selectedDish = computed(() => this.openDish());

  /** The Bites of that dish, newest first. */
  readonly bitesForDish = computed(() => this.dishBites());

  readonly isLoadingBites = computed(() => this.loadingBites());

  /**
   * Loads the aggregates for this restaurant's dishes.
   *
   * One read for the whole menu rather than one per row, and a failure is an
   * empty map: the signal under a dish is worth having and is not worth a menu
   * that does not load.
   */
  async loadStats(): Promise<void> {
    const restaurantId = this.restaurant()?.id;

    if (!restaurantId) {
      return;
    }

    this.itemStats.set(await this.dataAccess.loadMenuItemStats(restaurantId));
  }

  /** Opens what people said about one dish. */
  async openBitesFor(item: MenuItem): Promise<void> {
    if (!item.id) {
      return;
    }

    this.openDish.set(item);
    this.dishBites.set([]);
    this.loadingBites.set(true);

    try {
      this.dishBites.set(await this.dataAccess.loadBitesForMenuItem(item.id));
    } finally {
      this.loadingBites.set(false);
    }
  }

  /** Closes it, dropping the Bites so the next dish starts from nothing. */
  closeBites(): void {
    this.openDish.set(undefined);
    this.dishBites.set([]);
  }

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
      // The same link a Bite made from an order carries (issue #1113). This
      // path has had the `MenuItem` in hand since before that issue, and it is
      // the one that works today: table ordering needs a floor plan and
      // printed codes, and a menu needs neither - so without this the counts
      // under a menu row would be empty for everybody.
      ...(menuItem.id ? { menuItemId: menuItem.id } : {}),
    };

    this.dataAccess.prepareBiteFromMenuItem(biteToBeCreated);

    this.navController.navigateForward(['new-bite']);
  }
}
