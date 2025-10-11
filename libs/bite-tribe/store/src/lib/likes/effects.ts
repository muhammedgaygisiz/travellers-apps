import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  saveLike,
} from './actions';
import { map, switchMap, tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';
import { fromAuth } from 'ta-firestore';

@Injectable()
export class LikeEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

  startListener$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(fromAuth.AuthActions.loginSucceeded),
      switchMap(() => this.api.likes$()),
      map((likes) => loadedLikesFromApi({ likes })),
    );
  });

  saveLikeToBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveLike),

        tap(({ type, ...like }) => {
          this.api.saveLike(like);
        }),
      );
    },
    { dispatch: false },
  );

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
