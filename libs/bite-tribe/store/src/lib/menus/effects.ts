import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { map, skipWhile, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId } from '../router/selectors';
import { MenuActions } from './actions';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class MenuEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => this.api.menus$()),
      map((menus) => MenuActions.loadedMenusFromAPI({ menus })),
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
              return MenuActions.noMenuFound();
            }

            return MenuActions.loadedMenuFromAPI({ menu });
          }),
        ),
      ),
    );
  });

  saveMenuToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(MenuActions.saveMenu),
        tap(({ menu }) => {
          this.api.saveMenu(menu);
        }),
      );
    },
    { dispatch: false },
  );
}
