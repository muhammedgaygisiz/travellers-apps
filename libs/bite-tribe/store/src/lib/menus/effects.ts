import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { filter, from, map, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId } from '../router/selectors';
import { MenuActions } from './actions';
import { fromAuth } from 'ta-firestore';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable()
export class MenuEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  menuId = toSignal(this.store.select(menuId));

  loadMenuFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => {
        return payload.event.urlAfterRedirects.includes(`/menu/`);
      }),
      switchMap(() => {
        const menuId = this.menuId();

        return from(this.api.loadMenu(menuId)).pipe(
          map((menu) => {
            if (!menu) {
              return MenuActions.noMenuFound();
            }

            return MenuActions.loadedMenuFromAPI({ menu });
          }),
        );
      }),
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
