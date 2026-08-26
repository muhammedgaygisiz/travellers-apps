import { createFeatureSelector, createSelector } from '@ngrx/store';
import { key } from './key';
import type { Menu } from 'model';
import { menuId } from '../router/selectors';
import { adapter, MenuState } from './adapter';

const slice = createFeatureSelector<MenuState>(key);

const { selectAll } = adapter.getSelectors();

const allMenus = createSelector(slice, selectAll);

const failedMenuId = createSelector(slice, (slice) => slice.failedMenuId);

export const menu = createSelector(menuId, allMenus, (id, menus) =>
  menus.find((menu) => menu.id === id),
);

/**
 * True while the route's menu has neither arrived nor been given up on.
 *
 * A menu already in the store - the same one being read again, for instance -
 * is shown rather than hidden behind a skeleton, which is why this asks for the
 * menu and not merely for the read. See GitHub issue #1382.
 */
export const isMenuLoading = createSelector(
  menuId,
  menu,
  failedMenuId,
  (id: string | undefined, menu: Menu | undefined, failedMenuId) =>
    !!id && !menu && failedMenuId !== id,
);

/**
 * True once the route's menu has been read and there is no menu to show. It is
 * deliberately not the same as a loaded menu with no items, which is the empty
 * state the menu page has always had. See GitHub issue #1382.
 */
export const isMenuUnavailable = createSelector(
  menuId,
  menu,
  failedMenuId,
  (id: string | undefined, menu: Menu | undefined, failedMenuId) =>
    !!id && !menu && failedMenuId === id,
);
