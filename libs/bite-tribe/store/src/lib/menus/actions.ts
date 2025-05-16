import { createAction, props } from '@ngrx/store';
import { Menu } from 'model';

export const loadedMenuFromApi = createAction(
  '[MENUS] Loaded from API',
  props<{ menu: Menu }>()
);

export const noMenuFound = createAction('[MENUS] No restaurant found');
