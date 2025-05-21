import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { map, skipWhile, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { restaurantId } from '../router/selectors';
import {
  loadedRestaurantFromApi,
  noRestaurantFound,
  loadedRestaurantsFromApi,
  saveNewRestaurant,
} from './actions';

@Injectable()
export class RestaurantEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  loadRestaurantsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.allRestaurants$),
      map((restaurants) => loadedRestaurantsFromApi({ restaurants }))
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
          })
        )
      )
    );
  });

  saveNewRestaurantToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveNewRestaurant),
        tap(({ restaurant }) => {
          this.api.saveNewRestaurant(restaurant);
        })
      );
    },
    { dispatch: false }
  );
}
