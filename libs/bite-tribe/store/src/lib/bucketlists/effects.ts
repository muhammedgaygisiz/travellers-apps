import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BucketlistActions } from './actions';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';
import { AuthService } from 'ta-firestore';
import { shouldLoadBucketlists } from './utils/should-load-bucketlists';
import { NavController, ToastController } from '@ionic/angular/standalone';
import { PATH } from 'utils';
import { TranslocoService } from '@jsverse/transloco';

@Injectable()
export class BucketListEffect {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly authService = inject(AuthService);
  private readonly toastController = inject(ToastController);
  private readonly navController = inject(NavController);
  private readonly transloco = inject(TranslocoService);

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

  createBucketlistAndSaveBiteIdToBucketListEffect$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BucketlistActions.createAndSaveBiteIdToBucketlist),
      switchMap((params) =>
        from(this.api.createBucketListAndSaveBiteIdToBucketList(params)).pipe(
          map(() => BucketlistActions.createdBucketlistAndSavedBiteToIt()),
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
            this.showSuccessfulChangeToast(
              'Bucket list name updated successfully',
            );
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
            this.showBiteTrailSavedAsBucketListToast();
            return BucketlistActions.savedBiteTrailAsBucketList();
          }),
        ),
      ),
    );
  });

  private async showBiteTrailSavedAsBucketListToast(): Promise<void> {
    const toast = await this.toastController.create({
      message: this.transloco.translate('bitetrail-saved-as-bucket-list'),
      position: 'bottom',
      buttons: [
        {
          text: this.transloco.translate('go-to-bucket-lists'),
          handler: (): void => {
            void this.navController.navigateForward([PATH.MY_BUCKETLISTS]);
          },
        },
      ],
    });

    if (!toast) {
      return;
    }

    await toast.present();
  }

  private async showSuccessfulChangeToast(
    bucketlistNameUpdated: string,
  ): Promise<void> {
    const toast = await this.toastController.create({
      message: bucketlistNameUpdated,
      position: 'bottom',
      buttons: [
        {
          text: 'OK',
          role: 'confirm',
        },
      ],
    });

    await toast.present();
  }
}
