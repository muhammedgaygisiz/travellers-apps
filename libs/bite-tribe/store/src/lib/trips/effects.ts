import { ErrorHandler, inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TripApiService } from 'bite-tribe/api';
import { catchError, from, map, mergeMap, of, switchMap } from 'rxjs';
import { TripActions } from './actions';

@Injectable()
export class TripEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(TripApiService);
  private readonly errorHandler = inject(ErrorHandler);

  loadMyTrips$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TripActions.loadMyTrips),
      switchMap(() =>
        from(this.api.loadMyTrips()).pipe(
          map((trips) => TripActions.loadedMyTrips({ trips })),
          catchError((error) => {
            this.errorHandler.handleError(error);
            return of(TripActions.loadMyTripsFailed());
          }),
        ),
      ),
    ),
  );

  createTrip$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TripActions.createTrip),
      mergeMap(({ draft }) =>
        from(this.api.createTrip(draft)).pipe(
          map((trip) => TripActions.createdTrip({ trip })),
          catchError((error) => {
            this.errorHandler.handleError(error);
            return of(TripActions.createTripFailed());
          }),
        ),
      ),
    ),
  );

  updateTrip$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TripActions.updateTrip),
      mergeMap(({ trip, draft }) =>
        from(this.api.updateTrip(trip, draft)).pipe(
          map(() => TripActions.updatedTrip({ tripId: trip.id })),
          catchError((error) => {
            this.errorHandler.handleError(error);
            return of(TripActions.updateTripFailed());
          }),
        ),
      ),
    ),
  );

  /** An edit is read back rather than patched in, so the list shows what Firestore stored. */
  reloadAfterUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TripActions.updatedTrip),
      map(() => TripActions.loadMyTrips()),
    ),
  );

  deleteTrip$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TripActions.deleteTrip),
      mergeMap(({ tripId }) =>
        from(this.api.deleteTrip(tripId)).pipe(
          map(() => TripActions.deletedTrip({ tripId })),
          catchError((error) => {
            this.errorHandler.handleError(error);
            return of(TripActions.deleteTripFailed());
          }),
        ),
      ),
    ),
  );

  loadTripBites$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TripActions.loadTripBites),
      switchMap(({ trip }) =>
        from(this.api.loadTripBites(trip)).pipe(
          map((bites) =>
            TripActions.loadedTripBites({ tripId: trip.id, bites }),
          ),
          catchError((error) => {
            this.errorHandler.handleError(error);
            return of(TripActions.loadTripBitesFailed({ tripId: trip.id }));
          }),
        ),
      ),
    ),
  );
}
