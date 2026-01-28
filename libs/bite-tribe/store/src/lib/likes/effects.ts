import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  saveLike,
} from './actions';
import { catchError, filter, from, map, switchMap, tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';
import { BiteActions } from '../bites/actions';

@Injectable()
export class LikeEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(
        BiteActions.loadedLatestFromAPI,
        BiteActions.loadedByGPSPositionFromAPI,
      ),
      filter(({ bites }) => bites.length > 0),
      switchMap(({ bites }) =>
        from(this.api.loadLikesForBites(bites)).pipe(
          map((likes) => loadedLikesFromApi({ likes })),
        ),
      ),
    );
  });

  saveLikeToBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(saveLike),
      switchMap(({ type, ...like }) =>
        from(this.api.saveLike(like)).pipe(
          map((like) => loadedLikesFromApi({ likes: like ? [like] : [] })),
        ),
      ),
    );
  });

  removeLikeFromBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(removeLike),
      switchMap(async (like) => {
        const likeToBeDeleted = await this.api.removeLike(like.like);

        return deletedLike({ like: likeToBeDeleted });
      }),
    );
  });
}
