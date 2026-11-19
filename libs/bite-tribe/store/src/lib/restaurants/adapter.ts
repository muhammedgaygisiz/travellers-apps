import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Restaurant } from 'model';

export const adapter = createEntityAdapter<Restaurant>();

export interface RestaurantState extends EntityState<Restaurant> {
  /** Undefined until a restaurant or restaurant candidate has been selected. */
  restaurantToCreate?: Restaurant;
  /**
   * The last restaurant id that resolved to nothing or could not be read.
   * Cleared when that id loads after all. See GitHub issue #2124.
   */
  notFoundRestaurantId?: string;
}

export const initialState: RestaurantState = adapter.getInitialState();
