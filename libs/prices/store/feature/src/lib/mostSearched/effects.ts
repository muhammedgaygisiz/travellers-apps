/* eslint-disable no-unused-vars */
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { itemsLoaded, loadItems, saveItem } from './actions';
import {
  catchError,
  EMPTY,
  filter,
  map,
  mergeMap,
  switchMap,
  tap,
  withLatestFrom,
} from 'rxjs';
import { PricesService } from '@travellers-apps/prices/firestore/feature';
import { MostSearchedItem } from '@travellers-apps/utils-common';
import { NavController, ToastController } from '@ionic/angular';
import { fromAuth } from '../auth/index';
import { Store } from '@ngrx/store';

@Injectable()
export class MostSearchedItemsEffects {
  isAuthenticated$ = this.store.select(fromAuth.selectIsAuthenticated);

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
        withLatestFrom(this.isAuthenticated$),
        tap(async (result) => {
          const isAuthenticated = result[1];
          return await this.showUnauthorizedToast(isAuthenticated);
        }),
        filter((result) => result[1]),
        switchMap(([{ item }]) =>
          this.mostSearchedService.saveMostSearchedItem$(item)
        ),
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

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly mostSearchedService: PricesService,
    // eslint-disable-next-line no-unused-vars
    private readonly navController: NavController,
    // eslint-disable-next-line no-unused-vars
    private readonly store: Store,
    // eslint-disable-next-line no-unused-vars
    private toastController: ToastController
  ) {}

  private toItemsLoadedAction(mostSearchedEntries: MostSearchedItem[]) {
    return itemsLoaded({
      items: mostSearchedEntries,
    });
  }
}
