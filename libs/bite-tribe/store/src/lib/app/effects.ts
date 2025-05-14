import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { loadedGpsPosition, saveSettings } from './actions';
import { routerNavigatedAction } from '@ngrx/router-store';
import { debounceTime, from, map, switchMap, take, tap } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';
import { BiteTribeApiService } from 'bite-tribe/api';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);
  private readonly api = inject(BiteTribeApiService);

  getCurrentPosition$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      debounceTime(500),
      switchMap(() => from(getCurrentPosition(this.platform)).pipe(take(1))),
      map((currentPosition) => loadedGpsPosition({ position: currentPosition }))
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
