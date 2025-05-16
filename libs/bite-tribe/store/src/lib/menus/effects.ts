import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { map, skipWhile, switchMap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId } from '../router/selectors';
import { loadedMenuFromApi, noMenuFound } from './actions';

@Injectable()
export class MenuEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

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
