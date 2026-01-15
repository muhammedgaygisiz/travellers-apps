import { createAction, props } from '@ngrx/store';
import type { Link, Restaurant } from 'model';

export const loadedRestaurantsFromApi = createAction(
  '[RESTAURANTS] Loaded from API',
  props<{ restaurants: Restaurant[] }>(),
);

export const loadedRestaurantFromApi = createAction(
  '[RESTAURANTS] Loaded restaurant from API',
  props<{ restaurant: Restaurant }>(),
);

export const noRestaurantFound = createAction(
  '[RESTAURANTS] No restaurant found',
);

export const setRestaurantToCreate = createAction(
  '[RESTAURANTS] Set restaurant to create',
  props<{ restaurant: Restaurant }>(),
);

export const saveNewRestaurant = createAction(
  '[RESTAURANTS] Save new restaurant',
  props<{ restaurant: Restaurant }>(),
);

export const saveSocialMediaLinksForRestaurant = createAction(
  '[RESTAURANTS] Save social media links for restaurant',
  props<{ restaurantId: string; links: Link[] }>(),
);
