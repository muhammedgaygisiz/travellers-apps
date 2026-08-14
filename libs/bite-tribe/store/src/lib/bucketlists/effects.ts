import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BucketlistActions } from './actions';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';
import { AuthService } from 'ta-firestore';
import { shouldLoadBucketlists } from './utils/should-load-bucketlists';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { ToastService } from 'toast';

@Injectable()
export class BucketListEffect {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly navController = inject(NavController);

  loadMyBucketlists$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        routerNavigatedAction,
        BucketlistActions.removedBiteFromBucketlist,
        BucketlistActions.savedBiteToBucketlist,
        BucketlistActions.createdBucketlistAndSavedBiteToIt,
        BucketlistActions.createdBucketlist,
        BucketlistActions.deletedBucketlist,
        BucketlistActions.setBiteTriedOutStatusSucceeded,
        BucketlistActions.savedBiteTrailAsBucketList,
      ),
      shouldLoadBucketlists(),
      switchMap(() => {
        const user = this.authService.getUser();

        if (!user) {
          return [];
        }

        return from(this.api.loadBucketlistsByUserId(user.uid)).pipe(
          map((bucketlists) =>
            BucketlistActions.loadedFromAPI({ bucketlists }),
          ),
        );
      }),
    );
  });

  saveBiteIdToBucketListEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BucketlistActions.saveBiteToBucketlist),
      switchMap((params) =>
        from(this.api.saveBiteIdToBucketList(params)).pipe(
          map((bucketlist) =>
            BucketlistActions.savedBiteToBucketlist({ bucketlist }),
          ),
        ),
      ),
    ),
  );

  /**
   * The list and its first Bite are written together, so there is nothing to
   * roll back on failure. Confirming or reporting only once that write settles
   * keeps the Bite's inline create-and-add flow from claiming a save that never
   * happened. See GitHub issue #1231.
   */
  createBucketlistAndSaveBiteIdToBucketListEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.createAndSaveBiteIdToBucketlist),
      switchMap((params) =>
        from(this.api.createBucketListAndSaveBiteIdToBucketList(params)).pipe(
          map(() => {
            void this.toast.present({
              messageKey: 'bucket-list-created-with-bite',
              outcome: 'success',
            });
            return BucketlistActions.createdBucketlistAndSavedBiteToIt();
          }),
          catchError((error) => {
            console.error('Error creating bucket list for bite:', error);
            void this.toast.present({
              messageKey: 'bucket-list-create-with-bite-failed',
              outcome: 'failure',
            });
            return of(
              BucketlistActions.createBucketlistAndSaveBiteToItFailed(),
            );
          }),
        ),
      ),
    );
  });

  removeBiteFromBucketlistEffect = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.removeBiteFromBucketlist),
      switchMap((params) => {
        return from(this.api.removeBiteFromBucketlist(params)).pipe(
          map(() => {
            return BucketlistActions.removedBiteFromBucketlist();
          }),
        );
      }),
    );
  });

  createBucketlistEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.createBucketlist),
      switchMap(({ bucketlistName }) => {
        return from(this.api.createBucketList(bucketlistName)).pipe(
          map(() => BucketlistActions.createdBucketlist()),
        );
      }),
    );
  });

  deleteBucketlistEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.deleteBucketlist),
      switchMap(({ bucketlistId }) =>
        from(this.api.deleteBucketlist(bucketlistId)).pipe(
          map(() => BucketlistActions.deletedBucketlist()),
        ),
      ),
    );
  });

  updateBucketlistNameEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.updateBucketlistName),
      switchMap(({ bucketlistId, name }) =>
        from(this.api.updateBucketlistName(bucketlistId, name)).pipe(
          map(() => {
            void this.toast.present({
              messageKey: 'bucket-list-name-updated',
              outcome: 'success',
            });
            return BucketlistActions.updatedBucketlistName();
          }),
        ),
      ),
    );
  });

  setBiteTriedOutStatusEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.setBiteTriedOutStatus),
      switchMap(({ bucketlistId, biteId, checked }) =>
        from(
          this.api.updateBucketlistTriedOutStatus({
            bucketlistId,
            biteId,
            checked,
          }),
        ).pipe(
          map(() => BucketlistActions.setBiteTriedOutStatusSucceeded()),
          catchError(() => of(BucketlistActions.setBiteTriedOutStatusFailed())),
        ),
      ),
    );
  });

  saveBiteTrailAsBucketListEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.saveBiteTrailAsBucketList),
      switchMap((params) =>
        from(this.api.createBucketListFromBiteTrail(params)).pipe(
          map(() => {
            void this.showBiteTrailSavedAsBucketListToast();
            return BucketlistActions.savedBiteTrailAsBucketList();
          }),
        ),
      ),
    );
  });

  /**
   * The save is confirmed with the one thing the user is likely to want next,
   * so the toast's button replaces the plain dismiss.
   */
  private showBiteTrailSavedAsBucketListToast(): Promise<void> {
    return this.toast.present({
      messageKey: 'bitetrail-saved-as-bucket-list',
      outcome: 'success',
      action: {
        labelKey: 'go-to-bucket-lists',
        handler: (): void => {
          void this.navController.navigateForward([PATH.MY_BUCKETLISTS]);
        },
      },
    });
  }
}
