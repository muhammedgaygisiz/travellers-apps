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

  /**
   * Loads the caller's likes for feeds that do not carry them.
   *
   * The position feed is not in this list: `loadBitesByLocation` attaches the
   * caller's likes server-side, so asking for them again here would re-read
   * what already arrived. See {@link seedLikesFromPositionFeed$} and GitHub
   * issue #1357.
   */
  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.loadedLatestFromAPI),
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

  /**
   * Takes the likes the position feed already delivered into the likes state.
   *
   * They ride along with the Bites, so this costs no read and no round trip.
   * Doing it in one dispatch also keeps the feed from rendering liked Bites as
   * unliked for the seconds a separate fetch used to take.
   */
  seedLikesFromPositionFeed$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(BiteActions.loadedByGPSPositionFromAPI),
      map(({ bites }) =>
        loadedLikesFromApi({
          likes: bites.flatMap((bite) => bite.likes ?? []),
        }),
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
