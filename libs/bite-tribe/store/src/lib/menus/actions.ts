import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { Menu } from 'model';

export const MenuActions = createActionGroup({
  source: 'MENUS',
  events: {
    'Loaded menus from API': props<{ menus: Menu[] }>(),
    'Loaded menu from API': props<{ menu: Menu }>(),
    'No menu found': emptyProps(),
  },
});
