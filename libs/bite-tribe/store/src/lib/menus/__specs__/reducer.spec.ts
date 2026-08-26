import { reducer } from '../reducer';
import { initialState } from '../adapter';
import { MenuActions } from '../actions';
import { fromAuth } from 'ta-firestore';
import type { Menu } from 'model';

const MENU = { id: 'menu-1', categories: [] } as Menu;

describe('Menu Reducer', () => {
  describe('given a menu that failed to load', () => {
    const failed = reducer(
      initialState,
      MenuActions.menuLoadFailed({ menuId: 'menu-1' }),
    );

    it('should record which menu it was', () => {
      expect(failed.failedMenuId).toBe('menu-1');
    });

    it('should forget the failure once the read is in flight again', () => {
      // The page reads the failure to decide what it shows, so a retry has to
      // put it back into its loading state rather than keep the failure up.
      const retried = reducer(
        failed,
        MenuActions.loadMenu({ menuId: 'menu-1' }),
      );

      expect(retried.failedMenuId).toBeUndefined();
    });

    it('should forget the failure once a menu arrives', () => {
      const loaded = reducer(
        failed,
        MenuActions.loadedMenuFromAPI({ menu: MENU }),
      );

      expect(loaded.failedMenuId).toBeUndefined();
      expect(loaded.entities['menu-1']).toEqual(MENU);
    });
  });

  describe('given a menu id that resolves to nothing', () => {
    it('should record it as failed', () => {
      const state = reducer(
        initialState,
        MenuActions.noMenuFound({ menuId: 'menu-2' }),
      );

      expect(state.failedMenuId).toBe('menu-2');
    });
  });

  describe('given a logout', () => {
    it('should drop the menus and the failure with them', () => {
      const loaded = reducer(
        reducer(initialState, MenuActions.menuLoadFailed({ menuId: 'menu-1' })),
        MenuActions.loadedMenuFromAPI({ menu: MENU }),
      );

      const state = reducer(loaded, fromAuth.AuthActions.logoutSucceeded());

      expect(state.ids).toEqual([]);
      expect(state.failedMenuId).toBeUndefined();
    });
  });
});
