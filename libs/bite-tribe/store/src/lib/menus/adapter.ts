import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Menu } from 'model';

export interface MenuState extends EntityState<Menu> {
  /**
   * The menu id whose read settled without a menu, if one did.
   *
   * The page cannot tell "still loading" from "cannot be resolved" by looking
   * at the menu alone, because both are simply an absent menu, and it used to
   * answer the first with the empty state meant for the second. Recording the
   * id rather than a flag keeps the answer scoped to one menu, so a failure
   * carried over from a previous route cannot describe the menu now on screen.
   * See GitHub issue #1382.
   */
  failedMenuId?: string;
}

export const adapter = createEntityAdapter<Menu>();

export const initialState: MenuState = adapter.getInitialState({
  failedMenuId: undefined,
});
