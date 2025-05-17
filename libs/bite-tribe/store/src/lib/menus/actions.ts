import { createAction, props } from '@ngrx/store';
import { Menu } from 'model';

export const loadedMenusFromApi = createAction(
  '[MENUS] Loaded from API',
  props<{ menus: Menu[] }>()
);

export const loadedMenuFromApi = createAction(
  '[MENUS] Loaded menu from API',
  props<{ menu: Menu }>()
);

export const noMenuFound = createAction('[MENUS] No restaurant found');
