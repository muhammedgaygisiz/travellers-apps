import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { itemsLoaded, loadItems } from './actions';
import { catchError, EMPTY, map, mergeMap } from 'rxjs';
import { MostSearchedService } from '@travellers-apps/prices/firestore/feature';
import { MostSearchedItem } from '@travellers-apps/utils-common';

@Injectable()
export class MostSearchedItemsEffects {
  loadMostSearchedItemsEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadItems.type),
      mergeMap(() =>
        this.mostSearchedService.allMostSearchedItems$.pipe(
          map((mostSearchedEntries) =>
            this.toItemsLoadedAction(mostSearchedEntries)
          ),
          catchError(() => EMPTY)
        )
      )
    )
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly mostSearchedService: MostSearchedService
  ) {}

  private toItemsLoadedAction(mostSearchedEntries: MostSearchedItem[]) {
    return itemsLoaded({
      items: mostSearchedEntries,
    });
  }
}
