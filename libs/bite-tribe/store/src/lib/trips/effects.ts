import { ErrorHandler, inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { TripApiService } from 'bite-tribe/api';
import { AnalyticsEvent, AnalyticsService } from 'ta-firestore';
import { ToastService } from 'toast';
import { catchError, from, map, mergeMap, of, switchMap, tap } from 'rxjs';
import { TripActions } from './actions';

@Injectable()
export class TripEffects {
  private readonly actions$ = inject(Actions);
  private readonly api = inject(TripApiService);
  private readonly errorHandler = inject(ErrorHandler);
  private readonly analytics = inject(AnalyticsService);
  private readonly toast = inject(ToastService);

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

  /** Counted once Firestore has the write, not when the user tapped save. */
  logWrites$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          TripActions.createdTrip,
          TripActions.updatedTrip,
          TripActions.deletedTrip,
        ),
        tap(({ type }) => {
          const event = {
            [TripActions.createdTrip.type]: AnalyticsEvent.TripCreated,
            [TripActions.updatedTrip.type]: AnalyticsEvent.TripUpdated,
            [TripActions.deletedTrip.type]: AnalyticsEvent.TripDeleted,
          }[type];
          this.analytics.logEvent(event);
        }),
      ),
    { dispatch: false },
  );

  /**
   * The form closes on save, so a write that fails afterwards is the only
   * thing left to tell the user about. A failed load says nothing: the page
   * keeps what it showed.
   */
  reportFailedWrites$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          TripActions.createTripFailed,
          TripActions.updateTripFailed,
          TripActions.deleteTripFailed,
        ),
        tap(({ type }) => {
          void this.toast.present({
            messageKey:
              type === TripActions.deleteTripFailed.type
                ? 'trip-delete-failed'
                : 'trip-save-failed',
            outcome: 'failure',
          });
        }),
      ),
    { dispatch: false },
  );
}
