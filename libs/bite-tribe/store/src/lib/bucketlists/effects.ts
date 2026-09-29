import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BucketlistActions } from './actions';
import { catchError, from, map, Observable, of, switchMap } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';
import { AuthService } from 'ta-firestore';
import { shouldLoadBucketlists } from './utils/should-load-bucketlists';
import { NavController } from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { ToastService } from 'toast';
import { isListableBite } from 'model';

/**
 * Thrown by the save guard for a Bite that may not go on a bucket list, so the
 * failure branch can tell it apart from a write that failed.
 */
class BiteNotListableError extends Error {
  constructor(biteId: string | undefined) {
    super(`Bite ${biteId} is not listable and cannot be bucket-listed.`);
    this.name = 'BiteNotListableError';
  }
}

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

  /**
   * Only a listable Bite goes on a bucket list (GitHub issue #1717).
   *
   * Enforced here rather than only by hiding the control on the details page:
   * every save passes through these two effects, whatever surface dispatched
   * it. The Bite is read fresh instead of trusted from the caller, because the
   * actions carry nothing but its id. A missing Bite reads as not listable too.
   */
  private requireListableBite(biteId: string | undefined): Observable<void> {
    if (!biteId) {
      throw new BiteNotListableError(biteId);
    }

    return from(this.api.biteById(biteId)).pipe(
      map((bite) => {
        if (!isListableBite(bite)) {
          throw new BiteNotListableError(biteId);
        }
      }),
    );
  }

  /**
   * Rejects rather than quietly doing nothing, so the user is not left
   * thinking the Bite was saved.
   */
  private presentNotListable(): void {
    void this.toast.present({
      messageKey: 'bucket-list-bite-not-listable',
      outcome: 'failure',
    });
  }

  saveBiteIdToBucketListEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(BucketlistActions.saveBiteToBucketlist),
      switchMap((params) =>
        of(params.biteId).pipe(
          switchMap((biteId) => this.requireListableBite(biteId)),
          switchMap(() => from(this.api.saveBiteIdToBucketList(params))),
          map((bucketlist) =>
            BucketlistActions.savedBiteToBucketlist({ bucketlist }),
          ),
          catchError((error) => {
            if (error instanceof BiteNotListableError) {
              this.presentNotListable();
            } else {
              console.error('Error saving bite to bucket list:', error);
            }

            return of(BucketlistActions.saveBiteToBucketlistFailed());
          }),
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
        of(params.biteId).pipe(
          switchMap((biteId) => this.requireListableBite(biteId)),
          switchMap(() =>
            from(this.api.createBucketListAndSaveBiteIdToBucketList(params)),
          ),
          map(() => {
            void this.toast.present({
              messageKey: 'bucket-list-created-with-bite',
              outcome: 'success',
            });
            return BucketlistActions.createdBucketlistAndSavedBiteToIt();
          }),
          catchError((error) => {
            // A Bite that cannot be listed rejects the whole create-and-add:
            // a new, empty list the user never asked for alone is not a
            // partial success.
            if (error instanceof BiteNotListableError) {
              this.presentNotListable();

              return of(
                BucketlistActions.createBucketlistAndSaveBiteToItFailed(),
              );
            }

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
