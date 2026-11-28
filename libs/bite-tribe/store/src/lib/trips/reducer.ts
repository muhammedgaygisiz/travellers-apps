import { createReducer, on } from '@ngrx/store';
import type { Bite } from 'model';
import { fromAuth } from 'ta-firestore';
import { adapter, initialState } from './adapter';
import { TripActions } from './actions';

const withoutTripBites = (
  bitesByTripId: Record<string, Bite[]>,
  tripId: string,
): Record<string, Bite[]> =>
  Object.fromEntries(
    Object.entries(bitesByTripId).filter(([id]) => id !== tripId),
  );

export const reducer = createReducer(
  initialState,
  on(fromAuth.AuthActions.logoutSucceeded, () => initialState),
  on(TripActions.loadedMyTrips, (state, { trips }) => ({
    ...adapter.setAll(trips, state),
    loaded: true,
  })),
  on(TripActions.createdTrip, (state, { trip }) => adapter.addOne(trip, state)),
  // The trip's range may have moved, so its Bites are read again.
  on(TripActions.updatedTrip, (state, { tripId }) => ({
    ...state,
    bitesByTripId: withoutTripBites(state.bitesByTripId, tripId),
  })),
  on(TripActions.deletedTrip, (state, { tripId }) => ({
    ...adapter.removeOne(tripId, state),
    bitesByTripId: withoutTripBites(state.bitesByTripId, tripId),
  })),
  on(TripActions.loadedTripBites, (state, { tripId, bites }) => ({
    ...state,
    bitesByTripId: { ...state.bitesByTripId, [tripId]: bites },
  })),
);
