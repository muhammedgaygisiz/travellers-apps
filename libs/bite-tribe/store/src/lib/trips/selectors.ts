import {
  createFeatureSelector,
  createSelector,
  MemoizedSelector,
} from '@ngrx/store';
import type { Bite, Trip } from 'model';
import { key } from './key';
import { adapter, TripsState } from './adapter';

const slice = createFeatureSelector<TripsState>(key);

const { selectAll } = adapter.getSelectors();

export const trips = createSelector(slice, selectAll);

export const tripsLoaded = createSelector(slice, (state) => state.loaded);

/**
 * Newest start date first. `YYYY-MM-DD` sorts as text, and the title breaks a
 * tie so the order is stable.
 */
export const sortedTrips = createSelector(trips, (trips): Trip[] =>
  [...trips].sort(
    (a, b) =>
      b.startDate.localeCompare(a.startDate) || a.title.localeCompare(b.title),
  ),
);

export const tripById = (
  tripId: string,
): MemoizedSelector<object, Trip | undefined> =>
  createSelector(trips, (trips) => trips.find((trip) => trip.id === tripId));

/** `undefined` until the trip's Bites have been read. */
export const tripBites = (
  tripId: string,
): MemoizedSelector<object, Bite[] | undefined> =>
  createSelector(
    slice,
    (state): Bite[] | undefined => state.bitesByTripId[tripId],
  );
