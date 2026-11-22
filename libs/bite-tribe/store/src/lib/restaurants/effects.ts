import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { catchError, EMPTY, filter, from, map, of, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { menuId, restaurantId } from '../router/selectors';
import { restaurant } from './selectors';
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
  private readonly routeRestaurant = toSignal(this.store.select(restaurant));

  /**
   * Loads the Restaurant the current route identifies.
   *
   * A menu route loads it only when the store does not hold it already. Reached
   * from the Restaurant's own page it is there and is reused; opened by URL - a
   * reload, a bookmark, a shared link - nothing had loaded it, and the business
   * menu editor and Guest Bites lost the Restaurant's name (GitHub issue
   * #2231). A menu route whose Restaurant cannot be read reports nothing: its
   * menu loads from the route's `menuId` either way, so a menu page that
   * worked without the Restaurant keeps working exactly as before.
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
      map(() => ({ id: this.restaurantID(), onMenu: !!this.menuID() })),
      filter(
        (route): route is { id: string; onMenu: boolean } =>
          !!route.id && (!route.onMenu || !this.routeRestaurant()),
      ),
      switchMap(({ id, onMenu }) =>
        from(this.api.loadRestaurant(id)).pipe(
          switchMap((restaurant) => {
            if (restaurant) {
              return of(loadedRestaurantFromApi({ restaurant }));
            }

            return onMenu ? EMPTY : of(noRestaurantFound({ restaurantId: id }));
          }),
          catchError(() =>
            onMenu ? EMPTY : of(noRestaurantFound({ restaurantId: id })),
          ),
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
