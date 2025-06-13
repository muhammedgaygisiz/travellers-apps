import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { BiteTribeApiService } from 'bite-tribe/api';
import {
  saveBiteIdToBucketList,
  loadedBucketlistsFromApi,
  createAndSaveBiteIdToBucketList,
  removeBiteFromBucketlist,
  createBucketList,
} from './actions';
import { map, switchMap, tap } from 'rxjs';

@Injectable()
export class BucketListEffect {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

  loadBucketlistsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.allBucketlists$),
      map((bucketlists) => loadedBucketlistsFromApi({ bucketlists }))
    );
  });

  saveBiteIdToBucketListEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveBiteIdToBucketList),
        tap((params) => {
          return this.api.saveBiteIdToBucketList(params);
        })
      );
    },
    { dispatch: false }
  );

  createBucketlistAndSaveBiteIdToBucketListEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(createAndSaveBiteIdToBucketList),
        tap((params) => {
          return this.api.createBucketListAndSaveBiteIdToBucketList(params);
        })
      );
    },
    { dispatch: false }
  );

  removeBiteFromBucketlistEffect = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(removeBiteFromBucketlist),
        tap((params) => {
          return this.api.removeBiteFromBucketlist(params);
        })
      );
    },
    { dispatch: false }
  );

  createBucketlistEffect$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(createBucketList),
        tap(({ bucketlistName }) => {
          return this.api.createBucketList(bucketlistName);
        })
      );
    },
    { dispatch: false }
  );
}
