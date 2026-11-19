import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { catchError, filter, from, map, of, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId, restaurantId } from '../router/selectors';
import {
  loadedRestaurantFromApi,
  noRestaurantFound,
  saveSocialMediaLinksForRestaurant,
} from './actions';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable()
export class RestaurantEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  restaurantID = toSignal(this.store.select(restaurantId));
  menuID = toSignal(this.store.select(menuId));

  /**
   * Loads the Restaurant the current route identifies. The menu route is left
   * alone, because it reuses the Restaurant its own page already put in the
   * store.
   *
   * Which route this is comes from the parsed route parameters. Deciding it by
   * searching the URL text instead also matched a Restaurant whose id or place
   * name merely contained the word "menu", so that Restaurant was never loaded
   * on its own page: it fell back to Bite-derived data, and its menu button
   * then went to the dynamic `menu/default` route rather than its real menu.
   *
   * A missing document and a failed read both end in `noRestaurantFound`. A
   * rejected read used to escape the stream, so nothing was dispatched and the
   * page held its skeleton for ever. See GitHub issue #2124.
   */
  loadRestaurantById$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      map(() => this.restaurantID()),
      filter((id): id is string => !!id && !this.menuID()),
      switchMap((id) =>
        from(this.api.loadRestaurant(id)).pipe(
          map((restaurant) => {
            if (!restaurant) {
              return noRestaurantFound({ restaurantId: id });
            }

            return loadedRestaurantFromApi({ restaurant });
          }),
          catchError(() => of(noRestaurantFound({ restaurantId: id }))),
        ),
      ),
    );
  });

  saveSocialMediaLinksToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveSocialMediaLinksForRestaurant),
        tap(({ restaurantId, links }) => {
          this.api.saveSocialMediaLinksForRestaurant(restaurantId, links);
        }),
      );
    },
    { dispatch: false },
  );
}
