import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  saveLike,
} from './actions';
import { filter, from, map, switchMap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
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
      switchMap(({ like }) => {
        const { type, ...rest } = like as any;
        return from(this.api.saveLike(rest)).pipe(
          map((like) => loadedLikesFromApi({ likes: like ? [like] : [] })),
        );
      }),
    );
  });

  removeLikeFromBite$ = createEffect(() =>
    this.actions$.pipe(
      ofType(removeLike),
      switchMap(({ like }) =>
        from(this.api.removeLike(like)).pipe(
          map((like) => deletedLike({ like: like })),
        ),
      ),
    ),
  );
}
