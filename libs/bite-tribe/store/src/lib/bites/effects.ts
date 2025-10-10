import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deleteBite,
  loadedBiteCreator,
  loadedBitesFromApi,
  noPublicCreatorForBite,
  saveExistingBite,
  saveNewBite,
  saveTags,
} from './actions';
import { filter, map, switchMap, tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { bite } from './selectors';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);

  private readonly bite = toSignal(this.store.select(bite));

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.loginSucceeded),
      switchMap(() => this.api.bites$()),
      map((bites) => loadedBitesFromApi({ bites })),
    );
  });

  saveNewBiteToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveNewBite),
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
        ofType(saveExistingBite),
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
        ofType(saveTags),
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
        ofType(deleteBite),
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
          return loadedBiteCreator({
            biteCreator: biteCreator?.snapshot?.data,
          });
        }

        return noPublicCreatorForBite();
      }),
    );
  });
}
