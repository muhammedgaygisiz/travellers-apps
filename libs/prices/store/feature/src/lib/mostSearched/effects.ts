import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { itemsLoaded, loadItems, saveItem } from './actions';
import { catchError, EMPTY, map, mergeMap, switchMap, tap } from 'rxjs';
import { MostSearchedService } from '@travellers-apps/prices/firestore/feature';
import { MostSearchedItem } from '@travellers-apps/utils-common';
import { NavController } from '@ionic/angular';

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

  savePrice$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(saveItem.type),
        switchMap(({ item }) =>
          this.mostSearchedService.saveMostSearchedItem$(item)
        ),
        tap(() => this.navController.back())
      ),
    { dispatch: false }
  );

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly mostSearchedService: MostSearchedService,
    // eslint-disable-next-line no-unused-vars
    private readonly navController: NavController
  ) {}

  private toItemsLoadedAction(mostSearchedEntries: MostSearchedItem[]) {
    return itemsLoaded({
      items: mostSearchedEntries,
    });
  }
}
