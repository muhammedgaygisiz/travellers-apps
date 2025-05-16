import { createAction, props } from '@ngrx/store';
import { Restaurant } from 'model';

export const loadedRestaurantFromApi = createAction(
  '[RESTAURANTS] Loaded restaurant from API',
  props<{ restaurant: Restaurant }>()
);

export const noRestaurantFound = createAction(
  '[RESTAURANTS] No restaurant found'
);
