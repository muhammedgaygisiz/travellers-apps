import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType, rootEffectsInit } from '@ngrx/effects';
import { debounceTime, skip, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { slice as filteringAndSorting } from './selectors';
import { Preferences } from '@capacitor/preferences';
import { key } from './key';
import { fromAuth } from 'ta-firestore';
import { FilteringAndSortingActions } from './actions';

@Injectable()
export class FilteringAndSortingEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);

  persistFilteringAndSorting$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(rootEffectsInit),
        switchMap(() =>
          this.store.select(filteringAndSorting).pipe(
            skip(1),
            debounceTime(500),
            tap(async (state) => {
              await Preferences.set({
                key,
                value: JSON.stringify(state),
              });
            }),
          ),
        ),
      );
    },
    { dispatch: false },
  );

  loadFilteringAndSortingFromPreferences$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(fromAuth.AuthActions.loginSucceeded),
        tap(async (_) => {
          const { value: previousFilteringAndSorting } = await Preferences.get({
            key,
          });

          console.log(
            'previous filteringAndSorting',
            previousFilteringAndSorting,
          );

          if (previousFilteringAndSorting) {
            const slice = JSON.parse(previousFilteringAndSorting);
            this.store.dispatch(
              FilteringAndSortingActions.loadedFromPreferences({ slice }),
            );
          }
        }),
      );
    },
    { dispatch: false },
  );

  clearPreferencesOnLogout$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(fromAuth.AuthActions.logout),
        tap(async (_) => {
          await Preferences.remove({ key });
        }),
      );
    },
    { dispatch: false },
  );
}
