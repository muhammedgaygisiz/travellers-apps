import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteActions } from './actions';
import { catchError, filter, from, map, of, switchMap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { bite } from './selectors';
import { AppActions } from '../app/actions';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { BucketlistActions } from '../bucketlists/actions';
import { PATH } from 'utils';
import { userId } from '../router/selectors';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);
  private readonly storeService = inject(BiteTribeStoreService);

  private readonly bite = toSignal(this.store.select(bite));
  private readonly biteCreatorId = toSignal(this.store.select(userId));

  listenToLatest20Bites$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => this.api.latestBites$(20)),
      map((bites) => BiteActions.loadedLatestFromAPI({ bites })),
    );
  });

  loadBitesByCurrentUser$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(
        ({ payload }) =>
          payload.event.urlAfterRedirects.includes(PATH.MY_BITES) ||
          payload.event.urlAfterRedirects.includes(PATH.MY_PROFILE),
      ),
      switchMap(() => {
        const user = this.storeService.user();

        if (!user) {
          return of([]);
        }

        return from(this.api.bitesByUser(user?.uid));
      }),
      map((bites) => BiteActions.loadedByUserFromAPI({ bites })),
    );
  });

  loadBitesForBiteCreatorProfile$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(({ payload }) =>
        payload.event.urlAfterRedirects.includes(PATH.PROFILE),
      ),
      switchMap(() => {
        const biteCreatorId = this.biteCreatorId();

        if (!biteCreatorId) {
          return of(BiteActions.noBitesForBiteCreatorProfile());
        }

        return from(this.api.bitesByUser(biteCreatorId)).pipe(
          map((bites) => BiteActions.loadedByUserFromAPI({ bites })),
        );
      }),
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

  saveEditedBiteToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.saveExistingBite),
      switchMap(({ bite }) => {
        return from(this.api.saveEditedBite(bite)).pipe(
          map((bite) => BiteActions.savedBite({ bite })),
          catchError((err) => of(BiteActions.errorSavingBite({ bite }))),
        );
      }),
    );
  });

  deleteBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.deleteBite),
      switchMap(({ bite }) =>
        from(this.api.deleteBite(bite)).pipe(
          map((bite) => BiteActions.deletedBite({ bite })),
          catchError(() => of(BiteActions.errorDeletingBite({ bite }))),
        ),
      ),
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

        return from(this.api.getUserByBiteId(bite));
      }),
      map((biteCreator) => {
        if (biteCreator) {
          return BiteActions.loadedBiteCreator({ biteCreator });
        }

        return BiteActions.noPublicCreatorForBite();
      }),
    );
  });
}
