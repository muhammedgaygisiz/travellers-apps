import { computed, inject, Injectable, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MenuDataAccessService } from 'bite-tribe/menu-data-access';
import { DietaryVotePromptService } from 'bite-tribe/dietary-vote';
import type {
  Bite,
  DietaryLabelTallies,
  DietaryOwnVotes,
  Menu,
  MenuItem,
  MenuItemStats,
} from 'model';
import { NavController } from '@ionic/angular';
import { distinctUntilChanged, of, switchMap } from 'rxjs';
import type {
  MenuDietaryVoteClick,
  MenuDietaryVotes,
} from '../components/menu-item/menu-item.component';

@Injectable({
  providedIn: 'root',
})
export class MenuService {
  dataAccess = inject(MenuDataAccessService);
  private readonly navController = inject(NavController);
  private readonly dietaryVotePrompt = inject(DietaryVotePromptService);

  bite = this.dataAccess.bite;
  restaurant = this.dataAccess.restaurant;
  menu = this.dataAccess.menu;
  isMenuLoading = this.dataAccess.isMenuLoading;
  isMenuUnavailable = this.dataAccess.isMenuUnavailable;

  private readonly itemStats = signal<Record<string, MenuItemStats>>({});
  private readonly dishBites = signal<Bite[]>([]);
  private readonly openDish = signal<MenuItem | undefined>(undefined);
  private readonly loadingBites = signal(false);

  private readonly restaurantId = computed(() => this.restaurant()?.id);

  /**
   * What diners said about the dishes' dietary labels, by menu item id, live
   * (GitHub issue #2197): a vote anybody casts reaches every open menu.
   */
  private readonly dietaryTallies = toSignal(
    toObservable(this.restaurantId).pipe(
      distinctUntilChanged(),
      switchMap((restaurantId) =>
        restaurantId
          ? this.dataAccess.dietaryLabelTallies$(restaurantId)
          : of({} as Record<string, DietaryLabelTallies>),
      ),
    ),
    { initialValue: {} as Record<string, DietaryLabelTallies> },
  );

  private readonly ownDietaryVotes = signal<Record<string, DietaryOwnVotes>>(
    {},
  );

  /** The counts, the member's own votes, and whether a vote is offered. */
  readonly dietaryVotes = computed<MenuDietaryVotes>(() => ({
    tallies: this.dietaryTallies(),
    own: this.ownDietaryVotes(),
    canVote: this.dataAccess.isAuthenticated(),
  }));

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

  /** The member's own votes on this restaurant's dishes (issue #2197). */
  async loadOwnDietaryVotes(): Promise<void> {
    const restaurantId = this.restaurantId();

    this.ownDietaryVotes.set(
      restaurantId
        ? await this.dataAccess.loadOwnDietaryVotes(restaurantId)
        : {},
    );
  }

  /**
   * Confirms or disputes one of a dish's labels (GitHub issue #2197): asks,
   * sends and says what came of it, and reads the member's votes again once
   * it counted.
   */
  async voteDietaryLabel({ item, label }: MenuDietaryVoteClick): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId || !item.id) {
      return;
    }

    const result = await this.dietaryVotePrompt.run(
      label,
      this.ownDietaryVotes()[item.id]?.[label],
      (choice) =>
        this.dataAccess.voteDietaryLabel({
          target: { type: 'menuItem', restaurantId, menuItemId: item.id },
          label,
          ...choice,
        }),
    );

    if (result?.status === 'saved') {
      await this.loadOwnDietaryVotes();
    }
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

    // The menu's own currency (issue #1102), so a dish priced in Swiss francs
    // is not recorded as euros (issue #2129). A menu that states none passes
    // none, and the Bite form fills it the way it does for any new Bite -
    // from the location or the user's preferred currency, where the user sees
    // and can change it - instead of the euro this used to hardcode.
    const currency = this.menu()?.currency;
    const biteToBeCreated: Partial<Bite> = {
      ...(currency ? { currency } : {}),
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
