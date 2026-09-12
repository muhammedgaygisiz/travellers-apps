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
  let apiMock: { saveMenu: jest.Mock };
  let storeMock: {
    bite$: Observable<unknown>;
    restaurant$: Observable<unknown>;
    menu$: Observable<unknown>;
    isMenuLoading$: Observable<boolean>;
    isMenuUnavailable$: Observable<boolean>;
    restaurantIdFromUrl: jest.Mock;
    cacheBite: jest.Mock;
    retryMenuLoad: jest.Mock;
  };

  beforeEach(() => {
    apiMock = { saveMenu: jest.fn() };
    storeMock = {
      bite$: of(),
      restaurant$: of(),
      menu$: of(),
      isMenuLoading$: of(true),
      isMenuUnavailable$: of(false),
      restaurantIdFromUrl: jest.fn().mockReturnValue('restaurant-1'),
      cacheBite: jest.fn(),
      retryMenuLoad: jest.fn(),
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
     * parameter, and the loaded restaurant is a derived selector that resolves
     * to `undefined` without a GPS position — reading the id off it would fail
     * the save for anyone who declined the location permission.
     */
    it('should call saveMenu on BiteTribeApiService with the restaurant from the route', () => {
      const menu = { id: 'menu-1', categories: [] } as unknown as Menu;

      service.saveMenu(menu);

      expect(apiMock.saveMenu).toHaveBeenCalledWith(menu, 'restaurant-1');
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
});
