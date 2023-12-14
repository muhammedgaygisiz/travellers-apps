import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { loginSucceeded } from '../auth/actions';
import { catchError, EMPTY, map, mergeMap } from 'rxjs';
import { LocationService } from '@travellers-apps/prices/geoapify/feature';
import { locationLoaded } from './actions';

@Injectable()
export class LocationEffects {
  private readonly actions$ = inject(Actions);
  private readonly locationService = inject(LocationService);

  loadLocationEffect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginSucceeded.type),
      mergeMap(() =>
        this.locationService.getLocation$.pipe(
          map((location) => locationLoaded({ location })),
          catchError(() => EMPTY)
        )
      )
    )
  );
}
