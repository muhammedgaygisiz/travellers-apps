import { inject, Injectable } from '@angular/core';
import {
  Actions,
  createEffect,
  ofType,
  ROOT_EFFECTS_INIT,
} from '@ngrx/effects';
import {
  errorLoadingGpsPosition,
  loadedGpsPosition,
  loadedSettingsFromApi,
  saveSettings,
} from './actions';
import { routerNavigatedAction } from '@ngrx/router-store';
import { catchError, filter, map, of, switchMap, tap } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';

const IGNORED_PAGES_FOR_GPS = [
  '/start',
  '/login',
  '/registration',
  '/settings',
  '/bite/',
];

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);

  loadSettingsFromApi$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROOT_EFFECTS_INIT),
      switchMap(() => this.api.settings$),
      map((settings) => loadedSettingsFromApi({ settings }))
    );
  });

  getCurrentPosition$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      filter(
        ({ payload }) => !IGNORED_PAGES_FOR_GPS.includes(payload.event.url)
      ),
      switchMap(() => getCurrentPosition(this.platform)),
      map((currentPosition) =>
        loadedGpsPosition({ position: currentPosition })
      ),
      catchError((error) => {
        console.log(error);
        return of(errorLoadingGpsPosition({ error }));
      })
    );
  });

  saveSettingsToFirestore$ = createEffect(
    () => {
      return this.actions$.pipe(
        ofType(saveSettings),
        tap(({ settings }) => {
          this.api.saveSettings(settings);
        })
      );
    },
    { dispatch: false }
  );
}
