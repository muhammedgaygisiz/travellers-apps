import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { map, skipWhile, switchMap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId } from '../router/selectors';
import { loadedMenuFromApi, noMenuFound, loadedMenusFromApi } from './actions';

@Injectable()
export class MenuEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  loadMenusFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.allMenus$),
      map((menus) => loadedMenusFromApi({ menus }))
    );
  });

  loadMenuFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      switchMap(() =>
        this.store.select(menuId).pipe(
          skipWhile((menuId) => !menuId),
          switchMap((menuId) => {
            return this.api.loadMenu(menuId);
          }),
          map((menu) => {
            if (!menu) {
              return noMenuFound();
            }

            return loadedMenuFromApi({ menu });
          })
        )
      )
    );
  });
}
