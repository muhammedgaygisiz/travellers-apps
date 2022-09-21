import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { itemsLoaded, loadItems } from './actions';
import { catchError, EMPTY, map, mergeMap, Observable, of, tap } from 'rxjs';
import { MostSearchedService } from '@travellers-apps/prices/firestore/feature';
import { MostSearchedItem } from '@travellers-apps/utils-common';

@Injectable()
export class MostSearchedItemsEffects {
  loadMostSearchedItemsEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadItems.type),
      mergeMap(() =>
        (
          this.mostSearchedService.allMostSearchedItems$ as Observable<
            MostSearchedItem[]
          >
        ).pipe(
          map((mostSearchedEntries) =>
            itemsLoaded({
              items: mostSearchedEntries,
            })
          ),
          catchError(() => EMPTY)
        )
      )
    )
  );

  constructor(
    private readonly actions$: Actions,
    private readonly mostSearchedService: MostSearchedService
  ) {}
}
