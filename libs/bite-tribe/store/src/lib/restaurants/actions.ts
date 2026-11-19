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

/**
 * The route's restaurant id resolved to no document, or its read failed. Named
 * by id so the page can tell its own restaurant's answer from a stale one, and
 * end its skeleton in a not-found state instead of waiting for ever. See GitHub
 * issue #2124.
 */
export const noRestaurantFound = createAction(
  '[RESTAURANTS] No restaurant found',
  props<{ restaurantId: string }>(),
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
