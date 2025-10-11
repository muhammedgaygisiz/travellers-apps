import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { map, skipWhile, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { restaurantId } from '../router/selectors';
import {
  loadedRestaurantFromApi,
  loadedRestaurantsFromApi,
  noRestaurantFound,
  saveNewRestaurant,
  saveSocialMediaLinksForRestaurant,
} from './actions';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class RestaurantEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => this.api.restaurants$()),
      map((restaurants) => loadedRestaurantsFromApi({ restaurants })),
    );
  });

  loadRestaurantFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      switchMap(() =>
        this.store.select(restaurantId).pipe(
          skipWhile((restaurantId) => !restaurantId),
          switchMap((restaurantId) => {
            return this.api.loadRestaurant(restaurantId);
          }),
          map((restaurant) => {
            if (!restaurant) {
              return noRestaurantFound();
            }
            return loadedRestaurantFromApi({ restaurant });
          }),
        ),
      ),
    );
  });

  saveNewRestaurantToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveNewRestaurant),
        tap(({ restaurant }) => {
          this.api.saveNewRestaurant(restaurant);
        }),
      );
    },
    { dispatch: false },
  );

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
