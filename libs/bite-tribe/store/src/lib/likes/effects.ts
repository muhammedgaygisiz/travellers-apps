import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  saveLike,
} from './actions';
import { from, map, switchMap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable()
export class LikeEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

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
