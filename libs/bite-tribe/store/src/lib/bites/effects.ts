import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import { loadedBitesFromApi, saveLike, saveNewBite, saveTags } from './actions';
import { map, switchMap, tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

  loadBitesFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.allBites$),
      map((bites) => loadedBitesFromApi({ bites }))
    );
  });

  saveNewBiteToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveNewBite),
        tap(({ bite }) => {
          this.api.saveNewBite(bite);
        })
      );
    },
    { dispatch: false }
  );

  saveTagsToExistingBite$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveTags),
        tap((payload) => {
          this.api.saveTagsToExistingBite(payload);
        })
      );
    },
    { dispatch: false }
  );

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
}
