import { TestScheduler } from 'rxjs/testing';
import { Observable, of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { routerNavigatedAction } from '@ngrx/router-store';
import { BiteTribeApiService } from 'bite-tribe/api';
import type { Action } from '@ngrx/store';
import type { Restaurant } from 'model';
import { RestaurantEffects } from '../effects';
import { loadedRestaurantFromApi, noRestaurantFound } from '../actions';
import { menuId, restaurantId } from '../../router/selectors';

const assertDeepEqual = (actual: unknown, expected: unknown): void => {
  expect(actual).toEqual(expected);
};

const BiteTribeApiServiceMock = {
  loadRestaurant: jest.fn(),
};

const RESTAURANT = { id: 'restaurant-1', name: 'Khmer Kitchen' } as Restaurant;

/**
 * The effect reads the route from its parsed parameters, not from this URL.
 * Each case still carries the URL its route would really produce, so the
 * difference between the two ways of deciding stays visible.
 */
const navigationTo = (urlAfterRedirects: string): Action =>
  routerNavigatedAction({
    payload: {
      event: { urlAfterRedirects },
    } as unknown as Parameters<typeof routerNavigatedAction>[0]['payload'],
  });

describe(RestaurantEffects.name, () => {
  let scheduler: TestScheduler;
  let actions$: Observable<Action> = of({ type: 'INIT' });
  let effects: RestaurantEffects;
  let store: MockStore;

  /** Puts the effect on the route the given parameters describe. */
  const navigateTo = (route: {
    restaurantId?: string;
    menuId?: string;
  }): void => {
    store.overrideSelector(restaurantId, route.restaurantId);
    store.overrideSelector(menuId, route.menuId);
    store.refreshState();
  };

  beforeEach(() => {
    scheduler = new TestScheduler(assertDeepEqual);
    TestBed.configureTestingModule({
      providers: [
        RestaurantEffects,
        provideMockActions(() => actions$),
        provideMockStore(),
        { provide: BiteTribeApiService, useValue: BiteTribeApiServiceMock },
      ],
    });

    store = TestBed.inject(MockStore);
    effects = TestBed.inject(RestaurantEffects);

    BiteTribeApiServiceMock.loadRestaurant.mockReturnValue(of(RESTAURANT));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('loadRestaurantById$', () => {
    it('should load the restaurant the route identifies', () => {
      navigateTo({ restaurantId: 'restaurant-1' });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/restaurant-1'),
        });

        expectObservable(effects.loadRestaurantById$).toBe('a', {
          a: loadedRestaurantFromApi({ restaurant: RESTAURANT }),
        });
      });

      expect(BiteTribeApiServiceMock.loadRestaurant).toHaveBeenCalledWith(
        'restaurant-1',
      );
    });

    it('should load a restaurant whose id contains "menu"', () => {
      // The route is read from its parameters. Deciding it by searching the URL
      // text took this id for a menu route, so the restaurant was never loaded
      // on its own page and its menu button fell through to `menu/default`.
      navigateTo({ restaurantId: 'the-menu-house' });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/the-menu-house'),
        });

        expectObservable(effects.loadRestaurantById$).toBe('a', {
          a: loadedRestaurantFromApi({ restaurant: RESTAURANT }),
        });
      });

      expect(BiteTribeApiServiceMock.loadRestaurant).toHaveBeenCalledWith(
        'the-menu-house',
      );
    });

    it('should leave the menu route alone', () => {
      navigateTo({ restaurantId: 'restaurant-1', menuId: 'menu-1' });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/restaurant-1/menu/menu-1'),
        });

        expectObservable(effects.loadRestaurantById$).toBe('');
      });

      expect(BiteTribeApiServiceMock.loadRestaurant).not.toHaveBeenCalled();
    });

    it('should ignore a route that identifies no restaurant', () => {
      navigateTo({});

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/place/Khmer%20Kitchen'),
        });

        expectObservable(effects.loadRestaurantById$).toBe('');
      });

      expect(BiteTribeApiServiceMock.loadRestaurant).not.toHaveBeenCalled();
    });

    it('should report an id that resolves to no restaurant', () => {
      BiteTribeApiServiceMock.loadRestaurant.mockReturnValue(of(undefined));
      navigateTo({ restaurantId: 'restaurant-1' });

      scheduler.run(({ cold, expectObservable }) => {
        actions$ = cold('a', {
          a: navigationTo('/bite/bite-1/restaurant/restaurant-1'),
        });

        expectObservable(effects.loadRestaurantById$).toBe('a', {
          a: noRestaurantFound(),
        });
      });
    });
  });
});
