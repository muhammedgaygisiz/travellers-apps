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
        debounceTime(200),
        tap(async () => {
          const { value: previousFilteringAndSorting } = await Preferences.get({
            key,
          });

          if (previousFilteringAndSorting) {
            try {
              const slice = JSON.parse(previousFilteringAndSorting);
              this.store.dispatch(
                FilteringAndSortingActions.loadedFromPreferences({ slice }),
              );
            } catch (err) {
              console.error(
                'Failed to parse filteringAndSorting from preferences:',
                err,
              );
              // Optionally, clear the corrupted preference or dispatch an error action here
            }
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
        tap(async () => {
          await Preferences.remove({ key });
        }),
      );
    },
    { dispatch: false },
  );
}
