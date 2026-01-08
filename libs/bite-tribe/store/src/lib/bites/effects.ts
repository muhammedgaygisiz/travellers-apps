import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteActions } from './actions';
import { catchError, filter, from, map, of, switchMap, tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { bite } from './selectors';
import { AppActions } from '../app/actions';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { BucketlistActions } from '../bucketlists/actions';
import { PATH } from 'utils';

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);
  private readonly storeService = inject(BiteTribeStoreService);

  private readonly bite = toSignal(this.store.select(bite));

  loadBitesByCurrentUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) =>
        payload.event.urlAfterRedirects.includes(PATH.MY_BITES),
      ),
      switchMap((action) => {
        const user = this.storeService.user();

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

  loadBitesByBucketlistId$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) =>
        payload.event.urlAfterRedirects.includes('/my-bucketlists/'),
      ),
      switchMap(() => {
        const bucketlist = this.storeService.bucketlist();

        if (!bucketlist) {
          return of(BucketlistActions.noBucketlistFound());
        }

        return from(this.api.bitesByBucketlist(bucketlist)).pipe(
          map((bites) => BiteActions.loadedByBucketlistFromAPI({ bites })),
        );
      }),
    );
  });

  saveNewBiteToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.saveNewBite),
      switchMap(({ bite }) =>
        from(this.api.saveNewBite(bite)).pipe(
          map((bite) => BiteActions.savedBite({ bite })),
          catchError((err) => of(BiteActions.errorSavingBite({ bite }))),
        ),
      ),
    );
  });

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

  deleteBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.deleteBite),
      switchMap(({ bite }) => {
        return from(this.api.deleteBite(bite)).pipe(
          map((bite) => BiteActions.deletedBite({ bite })),
          catchError((err) => of(BiteActions.errorDeletingBite({ bite }))),
        );
      }),
    );
  });

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
