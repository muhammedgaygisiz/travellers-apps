import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { Action } from '@ngrx/store';
import type { Menu } from 'model';
import { MenuEffects } from '../effects';
import { MenuActions } from '../actions';
import { menuId } from '../../router/selectors';

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  expect(actual).toEqual(expected);
};

const BiteTribeApiServiceMock = {
  loadMenu: jest.fn(),
};

const MENU = { id: 'menu-1', categories: [] } as Menu;

/**
 * The effect reads the route from its parsed parameter, not from this URL. Each
 * case still carries the URL its route would really produce, so the difference
 * between the two ways of deciding stays visible.
 */
const navigationTo = (urlAfterRedirects: string): Action =>
  routerNavigatedAction({
    payload: {
      event: { urlAfterRedirects },
    } as unknown as Parameters<typeof routerNavigatedAction>[0]['payload'],
  });

describe(MenuEffects.name, () => {
  let scheduler: TestScheduler;
  let actions$: Observable<Action> = of({ type: 'INIT' });
  let effects: MenuEffects;
  let store: MockStore;

  /** Puts the effect on the route the given parameters describe. */
  const navigateTo = (route: { menuId?: string }): void => {
    store.overrideSelector(menuId, route.menuId);
    store.refreshState();
  };

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        MenuEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
      ],
    });

    store = TestBed.inject(MockStore);
    effects = TestBed.inject(MenuEffects);

    BiteTribeApiServiceMock.loadMenu.mockReturnValue(of(MENU));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadMenuFromApi$', () => {
    it('should load the menu the route identifies', () => {
      navigateTo({ menuId: 'menu-1' });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/restaurant-1/menu/menu-1'),
        });

        expectObservable(effects.loadMenuFromApi$).toBe('a', {
          a: MenuActions.loadedMenuFromAPI({ menu: MENU }),
        });
      });

      expect(BiteTribeApiServiceMock.loadMenu).toHaveBeenCalledWith('menu-1');
    });

    it('should ignore a route that identifies no menu', () => {
      // Without a menu id there is nothing to load, so the loader is never
      // asked for an undefined document.
      navigateTo({});

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/the-menu-house'),
        });

        expectObservable(effects.loadMenuFromApi$).toBe('');
      });

      expect(BiteTribeApiServiceMock.loadMenu).not.toHaveBeenCalled();
    });

    it('should report an id that resolves to no menu', () => {
      BiteTribeApiServiceMock.loadMenu.mockReturnValue(of(undefined));
      navigateTo({ menuId: 'menu-1' });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/restaurant-1/menu/menu-1'),
        });

        expectObservable(effects.loadMenuFromApi$).toBe('a', {
          a: MenuActions.noMenuFound(),
        });
      });
    });
  });
});
