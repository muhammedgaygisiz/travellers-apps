import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BucketlistActions } from './actions';
import { filter, from, map, switchMap, tap } from 'rxjs';
import { routerNavigatedAction } from '@ngrx/router-store';
import { PATH } from 'utils';
import { User } from '@capacitor-firebase/authentication/dist/esm/definitions';
import { AuthService } from 'ta-firestore';

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
      filter((action) => {
        if (action.type === routerNavigatedAction.type) {
          const { payload } = action;
          const urlAfterRedirects = payload.event.urlAfterRedirects;
          return (
            (urlAfterRedirects.startsWith(`/${PATH.MY_BUCKETLISTS}`) &&
              urlAfterRedirects.endsWith(PATH.MY_BUCKETLISTS)) ||
            (urlAfterRedirects.startsWith(`/${PATH.BITE}`) &&
              !urlAfterRedirects.includes(`${PATH.RESTAURANT}`))
          );
        }

        if (action.type === BucketlistActions.removeBiteFromBucketlist.type) {
          return true;
        }

        if (action.type === BucketlistActions.savedBiteToBucketlist.type) {
          return true;
        }

        if (
          action.type ===
          BucketlistActions.createdBucketlistAndSavedBiteToIt.type
        ) {
          return true;
        }

        return false;
      }),
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

  removeBiteFromBucketlistEffect = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BucketlistActions.removeBiteFromBucketlist),
        tap((params) => {
          return this.api.removeBiteFromBucketlist(params);
        }),
      );
    },
    { dispatch: false },
  );

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
