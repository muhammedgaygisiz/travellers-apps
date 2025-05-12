import { createAction, props } from '@ngrx/store';
import { Restaurant } from 'model';

export const loadedRestaurant = createAction(
  '[RESTAURANTS] Loaded restaurant from API',
  props<{ restaurant: Restaurant }>()
);
