import { createAction, props } from '@ngrx/store';
import { Restaurant } from 'model';

export const loadedRestaurant = createAction(
  '[RESTAURANTS] Loaded restaurant from API',
  props<{ restaurant: Restaurant }>()
);

export const noRestaurantFound = createAction(
  '[RESTAURANTS] No restaurant found'
);
