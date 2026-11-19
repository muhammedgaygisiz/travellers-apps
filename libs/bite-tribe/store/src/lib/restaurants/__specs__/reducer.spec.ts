import type { Restaurant } from 'model';
import { reducer } from '../reducer';
import { initialState } from '../adapter';
import { loadedRestaurantFromApi, noRestaurantFound } from '../actions';

const RESTAURANT = { id: 'r-1', name: 'Khmer Kitchen' } as Restaurant;

/** See GitHub issue #2124. */
describe('restaurants reducer, not-found tracking', () => {
  it('records the id that resolved to nothing', () => {
    const state = reducer(
      initialState,
      noRestaurantFound({ restaurantId: 'r-1' }),
    );

    expect(state.notFoundRestaurantId).toBe('r-1');
  });

  it('clears it when that restaurant loads after all', () => {
    const notFound = reducer(
      initialState,
      noRestaurantFound({ restaurantId: 'r-1' }),
    );
    const state = reducer(
      notFound,
      loadedRestaurantFromApi({ restaurant: RESTAURANT }),
    );

    expect(state.notFoundRestaurantId).toBeUndefined();
    expect(state.entities['r-1']).toEqual(RESTAURANT);
  });

  it('keeps it when a different restaurant loads', () => {
    const notFound = reducer(
      initialState,
      noRestaurantFound({ restaurantId: 'r-2' }),
    );
    const state = reducer(
      notFound,
      loadedRestaurantFromApi({ restaurant: RESTAURANT }),
    );

    expect(state.notFoundRestaurantId).toBe('r-2');
  });
});
