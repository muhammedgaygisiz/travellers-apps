import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BucketlistActions } from './actions';
import { map, switchMap, tap } from 'rxjs';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class BucketListEffect {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => this.api.bucketlists$()),
      map((bucketlists) => BucketlistActions.loadedFromAPI({ bucketlists })),
    );
  });

  saveBiteIdToBucketListEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BucketlistActions.saveBiteToBucketlist),
        tap((params) => {
          return this.api.saveBiteIdToBucketList(params);
        }),
      );
    },
    { dispatch: false },
  );

  createBucketlistAndSaveBiteIdToBucketListEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(BucketlistActions.createAndSaveBiteIdToBucketlist),
        tap((params) => {
          return this.api.createBucketListAndSaveBiteIdToBucketList(params);
        }),
      );
    },
    { dispatch: false },
  );

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
