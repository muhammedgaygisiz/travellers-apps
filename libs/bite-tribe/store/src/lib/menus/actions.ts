import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Menu } from 'model';

export const MenuActions = createActionGroup({
  source: 'MENUS',
  events: {
    /**
     * Asks for the menu the current route identifies. Raised on navigation and
     * again on a retry, so the read the page is waiting for is always named by
     * an action rather than only by a router event. See GitHub issue #1382.
     */
    'Load menu': props<{ menuId: string }>(),
    'Loaded menus from API': props<{ menus: Menu[] }>(),
    'Loaded menu from API': props<{ menu: Menu }>(),
    /** The read came back and the menu document does not exist. */
    'No menu found': props<{ menuId: string }>(),
    /** The read itself failed - a timeout, a rejected permission, an offline device. */
    'Menu load failed': props<{ menuId: string }>(),
    /** Asks for the failed read again from the menu page. */
    'Retry menu load': emptyProps(),
  },
});
