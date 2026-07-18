import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Restaurant } from 'model';

export const adapter = createEntityAdapter<Restaurant>();

export const initialState: EntityState<Restaurant> = adapter.getInitialState();

export interface RestaurantState extends EntityState<Restaurant> {
  restaurantToCreate: Restaurant;
}
