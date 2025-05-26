import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { map, switchMap, tap } from 'rxjs';
import {
  deletedLike,
  loadedLikesFromApi,
  removeLike,
  saveLike,
} from './actions';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable()
export class LikeEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

  loadLikesFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.allLikes$),
      map((likes) => loadedLikesFromApi({ likes }))
    );
  });

  saveLikeToBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveLike),
        // eslint-disable-next-line no-unused-vars
        tap(({ type, ...like }) => {
          this.api.saveLike(like);
        })
      );
    },
    { dispatch: false }
  );

  removeLikeFromBite$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(removeLike),
      switchMap(async (like) => {
        const likeToBeDeleted = await this.api.removeLike(like.like);

        return deletedLike({ like: likeToBeDeleted });
      })
    );
  });
}
