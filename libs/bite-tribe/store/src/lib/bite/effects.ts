import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { saveNewBite } from './actions';
import { tap } from 'rxjs';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable()
export class BiteEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(BiteTribeApiService);

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
}
