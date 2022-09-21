import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { itemsLoaded, loadItems } from './actions';
import { catchError, EMPTY, map, mergeMap } from 'rxjs';
import { MostSearchedItem } from './index';
import { HttpClient } from '@angular/common/http';
import { MostSearchedService } from './most-searched.service';

@Injectable()
export class MostSearchedItemsEffects {
  loadMostSearchedItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadItems.type),
      mergeMap(() =>
        this.mostSearchedService.getAll().pipe(
          map((mostSearchedEntries: MostSearchedItem[]) =>
            itemsLoaded({ items: mostSearchedEntries })
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
