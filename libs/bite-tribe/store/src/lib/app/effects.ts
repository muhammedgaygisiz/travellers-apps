import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { loadedGpsPosition } from './actions';
import { routerNavigatedAction } from '@ngrx/router-store';
import { debounceTime, from, map, switchMap, take } from 'rxjs';
import { getCurrentPosition } from 'geolocation';
import { Platform } from '@ionic/angular';

@Injectable()
export class AppEffect {
  private readonly actions$ = inject(Actions);
  private readonly platform = inject(Platform);

  getCurrentPosition$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(routerNavigatedAction),
      debounceTime(500),
      switchMap(() => from(getCurrentPosition(this.platform)).pipe(take(1))),
      map((currentPosition) => loadedGpsPosition({ position: currentPosition }))
    );
  });
}
