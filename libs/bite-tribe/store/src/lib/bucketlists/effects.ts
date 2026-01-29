import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BucketlistActions } from './actions';
import { filter, from, map, switchMap, tap } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { AuthService } from 'ta-firestore';
import { shouldLoadBucketlists } from './utils/should-load-bucketlists';

@Injectable()
export class BucketListEffect {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly authService = inject(AuthService);

  loadMyBucketlists = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        routerNavigatedAction,
        BucketlistActions.removeBiteFromBucketlist,
        BucketlistActions.savedBiteToBucketlist,
        BucketlistActions.createdBucketlistAndSavedBiteToIt,
      ),
      shouldLoadBucketlists(),
      switchMap(() => {
        const user = this.getUser();

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

  getUser(): User | null | undefined {
    const authState = this.authService.authState();
    return authState?.user;
  }

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
          map((bucketlist) =>
            BucketlistActions.createdBucketlistAndSavedBiteToIt(),
          ),
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

  createBucketlistEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BucketlistActions.createBucketlist),
        tap(({ bucketlistName }) => {
          return this.api.createBucketList(bucketlistName);
        }),
      );
    },
    { dispatch: false },
  );
}
