import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { fromAuth } from 'ta-firestore';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  removeLikeFailed,
  saveLike,
  saveLikeFailed,
} from './actions';
import {
  catchError,
  concatMap,
  filter,
  from,
  map,
  of,
  switchMap,
  withLatestFrom,
} from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { BiteActions } from '../bites/actions';

@Injectable()
export class LikeEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);
  private readonly store = inject(Store);

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        BiteActions.loadedLatestFromAPI,
        BiteActions.loadedByGPSPositionFromAPI,
      ),
      filter(({ bites }) => bites.length > 0),
      withLatestFrom(this.store.select(fromAuth.selectUserId)),
      filter(([, userId]) => !!userId),
      switchMap(([{ bites }, userId]) =>
        from(this.api.loadLikesForBites(bites, userId as string)).pipe(
          map((likes) => loadedLikesFromApi({ likes })),
        ),
      ),
    );
  });

  saveLikeToBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(saveLike),
      concatMap(({ like, previousLikeType }) =>
        from(this.api.saveLike(like)).pipe(
          map((savedLike) =>
            savedLike
              ? loadedLikesFromApi({ likes: [savedLike] })
              : saveLikeFailed({ like, previousLikeType }),
          ),
          catchError(() => of(saveLikeFailed({ like, previousLikeType }))),
        ),
      ),
    );
  });

  removeLikeFromBite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeLike),
      concatMap(({ like }) =>
        from(this.api.removeLike(like)).pipe(
          map((removedLike) => deletedLike({ like: removedLike })),
          catchError(() => of(removeLikeFailed({ like }))),
        ),
      ),
    ),
  );
}
