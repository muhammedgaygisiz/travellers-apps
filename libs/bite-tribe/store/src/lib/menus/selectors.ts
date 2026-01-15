import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import { EntityState } from '@ngrx/entity';
import type { Menu } from 'model';
import { menuId } from '../router/selectors';
import { adapter } from './adapter';

const slice = createFeatureSelector<EntityState<Menu>>(key);

const { selectAll } = adapter.getSelectors();

const allMenus = createSelector(slice, selectAll);

export const menu = createSelector(menuId, allMenus, (id, menus) =>
  menus.find((menu) => menu.id === id),
);
