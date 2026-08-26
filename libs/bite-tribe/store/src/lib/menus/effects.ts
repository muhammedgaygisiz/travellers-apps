import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { catchError, filter, from, map, of, switchMap, timeout } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId } from '../router/selectors';
import { MenuActions } from './actions';
import { toSignal } from '@angular/core/rxjs-interop';

/**
 * How long a menu read may take before it counts as failed. Without a bound the
 * read can simply never settle - the page then waits for a menu that is never
 * coming, with nothing to explain it and no way to ask again. See GitHub issue
 * #1382.
 */
const MENU_LOAD_TIMEOUT_MS = 8000;

@Injectable()
export class MenuEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  menuId = toSignal(this.store.select(menuId));

  /**
   * Asks for the menu the current route identifies, taken from the parsed route
   * parameter rather than from the URL text. Its sibling in
   * `restaurants/effects.ts` read the URL and mistook any id containing the
   * word "menu" for a menu route; deciding on the parameter cannot be fooled by
   * a value, and it also hands the loader a defined id.
   */
  startMenuLoad$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(() => this.menuId()),
      filter((id): id is string => !!id),
      map((menuId) => MenuActions.loadMenu({ menuId })),
    );
  });

  /** Asks for the menu on screen again after a failed read. */
  retryMenuLoad$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MenuActions.retryMenuLoad),
      map(() => this.menuId()),
      filter((id): id is string => !!id),
      map((menuId) => MenuActions.loadMenu({ menuId })),
    );
  });

  /**
   * Reads the requested menu and reports every way the read can end, so the
   * page can tell a menu that has not arrived yet from one it will never get.
   */
  loadMenuFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MenuActions.loadMenu),
      switchMap(({ menuId }) =>
        from(this.api.loadMenu(menuId)).pipe(
          timeout(MENU_LOAD_TIMEOUT_MS),
          map((menu) => {
            if (!menu) {
              return MenuActions.noMenuFound({ menuId });
            }

            return MenuActions.loadedMenuFromAPI({ menu });
          }),
          catchError(() => of(MenuActions.menuLoadFailed({ menuId }))),
        ),
      ),
    );
  });
}
