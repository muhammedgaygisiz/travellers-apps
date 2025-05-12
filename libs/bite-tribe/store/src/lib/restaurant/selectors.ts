import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import { Restaurant } from 'model';
import { restaurantId } from '../router/selectors';
import { adapter } from '../restaurant/adapter';

const slice = createFeatureSelector<EntityState<Restaurant>>(key);

const { selectAll } = adapter.getSelectors();

const allRestaurants = createSelector(slice, selectAll);

export const restaurant = createSelector(
  restaurantId,
  allRestaurants,
  (id, restaurants) => restaurants.find((restaurant) => restaurant.id === id)
);
