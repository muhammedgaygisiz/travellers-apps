import { createEntityAdapter, EntityState } from '@ngrx/entity';
import { Restaurant } from 'model';

export const adapter = createEntityAdapter<Restaurant>();

export const initialState: EntityState<any> = adapter.getInitialState();

export interface RestaurantState extends EntityState<Restaurant> {
  restaurantToCreate: Restaurant;
}
