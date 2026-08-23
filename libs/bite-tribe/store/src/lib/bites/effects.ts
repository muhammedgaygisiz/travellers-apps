import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteActions } from './actions';
import {
  catchError,
  debounceTime,
  filter,
  from,
  map,
  of,
  switchMap,
  take,
  tap,
  timeout,
} from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { routerNavigatedAction } from '@ngrx/router-store';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { AppActions } from '../app/actions';
import { BiteTribeStoreService } from '../bite-tribe-store.service';
import { BucketlistActions } from '../bucketlists/actions';
import { PATH } from 'utils';
import { ToastService } from 'toast';
import { userId } from '../router/selectors';
import { fromAuth } from 'ta-firestore';

/**
 * How long the position-driven feed load may run before it counts as failed.
 * It has to stay well inside the native callable's own ~70s ceiling, which is
 * longer than a user will watch a skeleton.
 */
export const FEED_LOAD_TIMEOUT_MS = 20_000;

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toast = inject(ToastService);

  biteCreatorId = toSignal(this.store.select(userId));

  listenToLatest20Bites$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      debounceTime(200),
      take(1),
      switchMap(() => this.api.latestBites$(20)),
      debounceTime(200),
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

  /**
   * Loads the feed for a new position, and always settles.
   *
   * The Home skeleton stays up until this answers, so a request that never
   * comes back is indistinguishable from one that is still working: on iOS a
   * call issued right after connectivity returned held the feed under the
   * skeleton past a minute, and only a force quit cleared it (issue #1230).
   * After {@link FEED_LOAD_TIMEOUT_MS} the attempt is reported as failed, which
   * ends the loading state and offers a retry instead.
   */
  loadBitesByGpsPosition$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(AppActions.loadedGPSPosition),
      switchMap((action) => {
        const position = action.position;

        return from(
          this.api.bitesByPosition(
            position as unknown as Parameters<
              BiteTribeApiService['bitesByPosition']
            >[0],
          ),
        ).pipe(
          timeout(FEED_LOAD_TIMEOUT_MS),
          map((bites) => BiteActions.loadedByGPSPositionFromAPI({ bites })),
          catchError(() => of(BiteActions.errorLoadingByGPSPositionFromAPI())),
        );
      }),
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

  saveEditedBiteToFirestore$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.saveExistingBite),
      switchMap(({ bite }) => {
        return from(this.api.saveEditedBite(bite)).pipe(
          tap(() => {
            void this.toast.present({
              messageKey: 'bite-updated-successfully',
              outcome: 'success',
            });
          }),
          map((bite) => BiteActions.savedBite({ bite })),
          // `errorSavingBite` is dispatched and handled nowhere, so without this
          // toast a failed edit was indistinguishable from a successful one: the
          // form navigates back either way and said nothing. That is how a photo
          // that never uploaded looked like a photo that saved fine, for six
          // months. See GitHub issue #1229.
          catchError(() => {
            void this.toast.present({
              messageKey: 'bite-update-failed',
              outcome: 'failure',
            });

            return of(BiteActions.errorSavingBite({ bite }));
          }),
        );
      }),
    );
  });

  deleteBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.deleteBite),
      switchMap(({ bite }) =>
        from(this.api.deleteBite(bite)).pipe(
          tap(() => {
            void this.toast.present({
              messageKey: 'bite-deleted-successfully',
              outcome: 'success',
            });
          }),
          map((bite) => BiteActions.deletedBite({ bite })),
          catchError(() => of(BiteActions.errorDeletingBite({ bite }))),
        ),
      ),
    );
  });
}
