import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { routerNavigatedAction } from '@ngrx/router-store';
import { Store } from '@ngrx/store';
import { map, skipWhile, switchMap } from 'rxjs';
import { restaurantId } from '../router/selectors';
import { loadedRestaurant, noRestaurantFound } from './actions';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable()
export class RestaurantEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

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
            return loadedRestaurant({ restaurant });
          })
        )
      )
    );
  });
}
