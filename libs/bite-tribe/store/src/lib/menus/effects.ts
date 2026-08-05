import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { filter, from, map, switchMap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId } from '../router/selectors';
import { MenuActions } from './actions';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable()
export class MenuEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  menuId = toSignal(this.store.select(menuId));

  /**
   * Loads the menu the current route identifies, taken from the parsed route
   * parameter rather than from the URL text. Its sibling in
   * `restaurants/effects.ts` read the URL and mistook any id containing the
   * word "menu" for a menu route; deciding on the parameter cannot be fooled by
   * a value, and it also hands the loader a defined id.
   */
  loadMenuFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(() => this.menuId()),
      filter((id): id is string => !!id),
      switchMap((id) =>
        from(this.api.loadMenu(id)).pipe(
          map((menu) => {
            if (!menu) {
              return MenuActions.noMenuFound();
            }

            return MenuActions.loadedMenuFromAPI({ menu });
          }),
        ),
      ),
    );
  });
}
