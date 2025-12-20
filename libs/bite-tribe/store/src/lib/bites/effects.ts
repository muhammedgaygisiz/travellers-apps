import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteActions } from './actions';
import { filter, from, map, switchMap, tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { bite } from './selectors';
import { AppActions } from '../app/actions';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);

  private readonly bite = toSignal(this.store.select(bite));

  loadBitesByCurrentUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loadedUser),
      switchMap((action) => {
        const user = action.user;

        return from(this.api.bitesByUser(user));
      }),
      map((bites) => BiteActions.loadedByUserFromAPI({ bites })),
    );
  });

  loadBitesByGpsPosition$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.loadedGPSPosition),
      switchMap((action) => {
        const position = action.position;

        return from(this.api.bitesByPosition(position));
      }),
      map((bites) => BiteActions.loadedByGPSPositionFromAPI({ bites })),
    );
  });

  saveNewBiteToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BiteActions.saveNewBite),
        tap(({ bite }) => {
          this.api.saveNewBite(bite);
        }),
      );
    },
    { dispatch: false },
  );

  saveEditedBiteToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BiteActions.saveExistingBite),
        tap(({ bite }) => {
          this.api.saveEditedBite(bite);
        }),
      );
    },
    { dispatch: false },
  );

  saveTagsToExistingBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BiteActions.saveNewTags),
        tap((payload) => {
          this.api.saveTagsToExistingBite(payload);
        }),
      );
    },
    { dispatch: false },
  );

  deleteBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BiteActions.deleteBite),
        tap(({ bite }) => {
          this.api.deleteBite(bite);
        }),
      );
    },
    { dispatch: false },
  );

  loadUserFromBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) =>
        payload.event.urlAfterRedirects.includes('/bite/'),
      ),
      switchMap(() => {
        const bite = this.bite();

        return this.api.getUserByBiteId(bite);
      }),
      map((biteCreator) => {
        if (biteCreator?.snapshot?.data) {
          return BiteActions.loadedBiteCreator({
            biteCreator: biteCreator?.snapshot?.data,
          });
        }

        return BiteActions.noPublicCreatorForBite();
      }),
    );
  });
}
