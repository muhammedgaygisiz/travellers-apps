import { createEntityAdapter, EntityState } from '@ngrx/entity';
import type { Bite, Trip } from 'model';

export interface TripsState extends EntityState<Trip> {
  /** Whether the signed-in user's trips have been read since sign-in. */
  loaded: boolean;
  /** Each trip's Bites as last read, newest first. Never stored on the trip. */
  bitesByTripId: Record<string, Bite[]>;
}

export const adapter = createEntityAdapter<Trip>();

export const initialState: TripsState = adapter.getInitialState({
  loaded: false,
  bitesByTripId: {},
});
