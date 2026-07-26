import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Restaurant } from 'model';

export const adapter = createEntityAdapter<Restaurant>();

export interface RestaurantState extends EntityState<Restaurant> {
  /** Undefined until a restaurant or restaurant candidate has been selected. */
  restaurantToCreate?: Restaurant;
}

export const initialState: RestaurantState = adapter.getInitialState();
