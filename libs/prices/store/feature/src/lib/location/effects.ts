import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { loginSucceeded } from '../auth/actions';
import { catchError, EMPTY, map, mergeMap } from 'rxjs';
import { LocationService } from '@travellers-apps/prices/geoapify/feature';
import { locationLoaded } from './actions';

@Injectable()
export class LocationEffects {
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

  constructor(
    // eslint-disable-next-line no-unused-vars
    private readonly actions$: Actions,
    // eslint-disable-next-line no-unused-vars
    private readonly locationService: LocationService
  ) {}
}
