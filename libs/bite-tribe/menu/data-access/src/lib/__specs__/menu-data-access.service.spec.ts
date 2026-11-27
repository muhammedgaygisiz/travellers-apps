import { TestBed } from '@angular/core/testing';
import { MenuDataAccessService } from '../menu-data-access.service';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { BiteTribeApiService } from 'bite-tribe/api';
import { Menu } from 'model';
import { Observable, of } from 'rxjs';

jest.mock('@capacitor-firebase/firestore');
jest.mock('@capacitor-firebase/analytics');

describe(MenuDataAccessService.name, () => {
  let service: MenuDataAccessService;
  let apiMock: {
    saveMenu: jest.Mock;
    confirmMenuAsOwn: jest.Mock;
    loadMenuItemStats: jest.Mock;
    loadBitesForMenuItem: jest.Mock;
    loadBitesForRestaurant: jest.Mock;
    linkBiteToMenuItem: jest.Mock;
    dietaryLabelTallies$: jest.Mock;
    loadOwnDietaryVotes: jest.Mock;
    voteDietaryLabel: jest.Mock;
  };
  let storeMock: {
    bite$: Observable<unknown>;
    restaurant$: Observable<unknown>;
    menu$: Observable<unknown>;
    isMenuLoading$: Observable<boolean>;
    isMenuUnavailable$: Observable<boolean>;
    restaurantIdFromUrl: jest.Mock;
    cacheBite: jest.Mock;
    retryMenuLoad: jest.Mock;
    userId$: Observable<string>;
    isAuthenticated$: Observable<boolean>;
  };

  beforeEach(() => {
    apiMock = {
      saveMenu: jest.fn(),
      confirmMenuAsOwn: jest.fn().mockResolvedValue(undefined),
      loadMenuItemStats: jest.fn().mockResolvedValue({}),
      loadBitesForMenuItem: jest.fn().mockResolvedValue([]),
      loadBitesForRestaurant: jest.fn().mockResolvedValue([]),
      linkBiteToMenuItem: jest.fn().mockResolvedValue({}),
      dietaryLabelTallies$: jest.fn().mockReturnValue(of({})),
      loadOwnDietaryVotes: jest.fn().mockResolvedValue({ m1: {} }),
      voteDietaryLabel: jest.fn().mockResolvedValue({ status: 'saved' }),
    };
    storeMock = {
      bite$: of(),
      restaurant$: of(),
      menu$: of(),
      isMenuLoading$: of(true),
      isMenuUnavailable$: of(false),
      restaurantIdFromUrl: jest.fn().mockReturnValue('restaurant-1'),
      cacheBite: jest.fn(),
      retryMenuLoad: jest.fn(),
      userId$: of('member-1'),
      isAuthenticated$: of(true),
    };

    TestBed.configureTestingModule({
      providers: [
        MenuDataAccessService,
        { provide: BiteTribeApiService, useValue: apiMock },
        { provide: BiteTribeStoreService, useValue: storeMock },
      ],
    });

    service = TestBed.inject(MenuDataAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * Menus written before issue #1099 carry no ids, and the admin backfill only
   * reaches the collection once an operator presses it. Filling in what is
   * missing on read means the editor keys by id from the first render either
   * way, and the ids it generated are persisted by the owner's next save.
   */
  describe('menu', () => {
    /** A second service over a store whose menu is the one under test. */
    const serviceReading = (menu: unknown): MenuDataAccessService => {
      TestBed.resetTestingModule();

      TestBed.configureTestingModule({
        providers: [
          MenuDataAccessService,
          { provide: BiteTribeApiService, useValue: apiMock },
          {
            provide: BiteTribeStoreService,
            useValue: { ...storeMock, menu$: of(menu) },
          },
        ],
      });

      return TestBed.inject(MenuDataAccessService);
    };

    it('gives a legacy menu an id on every category, item and variant', () => {
      const [category] =
        serviceReading({
          id: 'menu-1',
          categories: [
            {
              title: 'Pizza',
              items: [
                { name: 'Margherita', price: 12, variants: [{ name: 'L' }] },
              ],
            },
          ],
        }).menu()?.categories ?? [];

      expect(category.id).toBeTruthy();
      expect(category.items[0].id).toBeTruthy();
      expect(category.items[0].variants?.[0].id).toBeTruthy();
    });

    it('passes a menu that already has ids through untouched', () => {
      const stored = {
        id: 'menu-1',
        categories: [
          {
            id: 'category-pizza',
            title: 'Pizza',
            items: [{ id: 'item-margherita', name: 'Margherita', price: 12 }],
          },
        ],
      } as unknown as Menu;

      expect(serviceReading(stored).menu()).toBe(stored);
    });

    it('leaves an absent menu absent', () => {
      expect(serviceReading(undefined).menu()).toBeUndefined();
    });
  });

  describe('saveMenu', () => {
    /**
     * The restaurant is passed alongside the menu because the ownership-scoped
     * Firestore rules read the write's authority from it: a menu document says
     * nothing about who may write it (issue #1078).
     *
     * `restaurant$` is deliberately empty here. The id comes from the route
     * parameter, and the loaded restaurant is a derived selector that is empty
     * until the restaurants have loaded — reading the id off it would fail the
     * save whenever it had not.
     */
    it('should call saveMenu on BiteTribeApiService with the restaurant from the route', () => {
      const menu = { id: 'menu-1', categories: [] } as unknown as Menu;

      service.saveMenu(menu);

      expect(apiMock.saveMenu).toHaveBeenCalledWith(menu, 'restaurant-1');
    });
  });

  /** See GitHub issue #2214. */
  describe('confirmMenuAsOwn', () => {
    it('confirms the menu for the restaurant from the route', async () => {
      await service.confirmMenuAsOwn('menu-1');

      expect(apiMock.confirmMenuAsOwn).toHaveBeenCalledWith(
        'menu-1',
        'restaurant-1',
      );
    });
  });

  describe('retryMenuLoad', () => {
    it('should ask the store for the menu again', () => {
      service.retryMenuLoad();

      expect(storeMock.retryMenuLoad).toHaveBeenCalled();
    });
  });

  describe('prepareBiteFromMenuItem', () => {
    it('should call cacheBite from store service', () => {
      const menu = { id: 'menu-1', categories: [] } as unknown as Menu;
      service.prepareBiteFromMenuItem(menu);
      expect(storeMock.cacheBite).toHaveBeenCalledWith(menu);
    });
  });
  /**
   * The aggregates and the Bites behind them (GitHub issue #1113).
   *
   * Both are plain delegations, and the assertion worth making is that they
   * stay plain: the restaurant comes from the caller rather than off the route,
   * because the menu screen holds a restaurant it was routed to and the store's
   * url reader answers the route the reader is on - which on the table-ordering
   * screen is not the same thing.
   */
  describe('menu item Bite stats', () => {
    it("asks the api for one restaurant's aggregates", async () => {
      const stats = {
        'item-margherita': {
          id: 'item-margherita',
          restaurantId: 'restaurant-1',
          biteCount: 2,
          ratingCount: 1,
          ratingSum: 4,
          updatedAt: 0,
        },
      };
      apiMock.loadMenuItemStats.mockResolvedValue(stats);

      await expect(service.loadMenuItemStats('restaurant-1')).resolves.toBe(
        stats,
      );
      expect(apiMock.loadMenuItemStats).toHaveBeenCalledWith('restaurant-1');
    });

    it('asks the api for the Bites of one dish', async () => {
      const bites = [{ id: 'bite-1' }];
      apiMock.loadBitesForMenuItem.mockResolvedValue(bites);

      await expect(
        service.loadBitesForMenuItem('item-margherita'),
      ).resolves.toBe(bites);
      expect(apiMock.loadBitesForMenuItem).toHaveBeenCalledWith(
        'item-margherita',
      );
    });
  });

  /** The business app's Guest Bites page (GitHub issue #2216). */
  describe('guest Bites', () => {
    it('reads the Bites of the restaurant on the route', async () => {
      await service.loadBitesForRestaurant();

      expect(apiMock.loadBitesForRestaurant).toHaveBeenCalledWith(
        'restaurant-1',
      );
    });

    it('passes a link through to the api', async () => {
      await service.linkBiteToMenuItem({ biteId: 'b1', notOnMenu: true });

      expect(apiMock.linkBiteToMenuItem).toHaveBeenCalledWith({
        biteId: 'b1',
        notOnMenu: true,
      });
    });
  });

  /** Diners' votes on the dishes' dietary labels (GitHub issue #2197). */
  describe('dietary votes', () => {
    it("reads the restaurant's menu scope, live", () => {
      service.dietaryLabelTallies$('r1');

      expect(apiMock.dietaryLabelTallies$).toHaveBeenCalledWith('menu__r1');
    });

    it("reads the member's own votes in that scope", async () => {
      await expect(service.loadOwnDietaryVotes('r1')).resolves.toEqual({
        m1: {},
      });
      expect(apiMock.loadOwnDietaryVotes).toHaveBeenCalledWith(
        'menu__r1',
        'member-1',
      );
    });

    it('passes a vote through to the api', async () => {
      const request = {
        target: { type: 'menuItem', restaurantId: 'r1', menuItemId: 'm1' },
        label: 'vegan',
        vote: 'confirm',
      } as const;

      await service.voteDietaryLabel(request);

      expect(apiMock.voteDietaryLabel).toHaveBeenCalledWith(request);
    });
  });
});
