import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { itemsLoaded, loadItems, saveItem } from './actions';
import {
  catchError,
  EMPTY,
  filter,
  map,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { PricesApiService } from 'prices/api';
import { NavController, ToastController } from '@ionic/angular';
import { fromAuth } from 'ta-firestore';
import { Store } from '@ngrx/store';
import { MostSearchedItem } from '../api/most-searched-item.model';

@Injectable()
export class MostSearchedItemsEffects {
  private readonly actions$ = inject(Actions);
  private readonly apiService = inject(PricesApiService);
  private readonly navController = inject(NavController);
  private readonly store = inject(Store);
  private readonly toastController = inject(ToastController);

  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);

  loadMostSearchedItemsEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadItems.type),
      switchMap(() =>
        this.apiService.allMostSearchedItems$.pipe(
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
        withLatestFrom(this.isAuthenticated$),
        tap(async (result) => {
          const isAuthenticated = result[1];
          return await this.showUnauthorizedToast(isAuthenticated);
        }),
        filter((result) => result[1]),
        switchMap(([{ item }]) => this.apiService.saveMostSearchedItem$(item)),
        tap(() => this.navController.back()),
        catchError(() => EMPTY)
      ),
    { dispatch: false }
  );

  private async showUnauthorizedToast(isAuthenticated: boolean) {
    if (!isAuthenticated) {
      const toast = await this.toastController.create({
        message: 'You have to be logged in',
        duration: 1500,
        position: 'bottom',
      });

      await toast.present();
    }
  }

  private toItemsLoadedAction(mostSearchedEntries: MostSearchedItem[]) {
    return itemsLoaded({
      items: mostSearchedEntries,
    });
  }
}
