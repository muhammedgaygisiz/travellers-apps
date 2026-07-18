import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { filter, from, map, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { restaurantId } from '../router/selectors';
import {
  loadedRestaurantFromApi,
  noRestaurantFound,
  saveNewRestaurant,
  saveSocialMediaLinksForRestaurant,
} from './actions';
import { PATH } from 'utils';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable()
export class RestaurantEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly api = inject(BiteTribeApiService);

  restaurantID = toSignal(this.store.select(restaurantId));

  loadRestaurantById$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) => {
        return (
          payload.event.urlAfterRedirects.includes(`${PATH.RESTAURANT}`) &&
          !payload.event.urlAfterRedirects.includes(`${PATH.MENU}`)
        );
      }),
      switchMap(() => {
        const restaurantId = this.restaurantID();

        if (!restaurantId) {
          return [noRestaurantFound()];
        }

        return from(this.api.loadRestaurant(restaurantId)).pipe(
          map((restaurant) => {
            if (!restaurant) {
              return noRestaurantFound();
            }

            return loadedRestaurantFromApi({ restaurant });
          }),
        );
      }),
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
