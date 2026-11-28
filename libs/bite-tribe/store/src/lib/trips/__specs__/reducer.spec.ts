import { fromAuth } from 'ta-firestore';
import type { Bite, Trip } from 'model';
import { TripActions } from '../actions';
import { initialState } from '../adapter';
import { reducer } from '../reducer';

const trip = (id: string, startDate = '2026-12-01'): Trip => ({
  id,
  userId: 'owner',
  title: id,
  startDate,
});
const bite = { id: 'bite-1' } as Bite;

describe('trips reducer', () => {
  it('replaces the trips on load and marks them loaded', () => {
    const before = reducer(
      initialState,
      TripActions.loadedMyTrips({ trips: [trip('old')] }),
    );

    const state = reducer(
      before,
      TripActions.loadedMyTrips({ trips: [trip('a'), trip('b')] }),
    );

    expect(state.ids).toEqual(['a', 'b']);
    expect(state.loaded).toBe(true);
  });

  it('adds a created trip', () => {
    const state = reducer(
      initialState,
      TripActions.createdTrip({ trip: trip('a') }),
    );

    expect(state.entities['a']).toEqual(trip('a'));
  });

  it("drops an edited trip's Bites so they are read for the new range", () => {
    const withBites = reducer(
      reducer(initialState, TripActions.loadedMyTrips({ trips: [trip('a')] })),
      TripActions.loadedTripBites({ tripId: 'a', bites: [bite] }),
    );

    const state = reducer(withBites, TripActions.updatedTrip({ tripId: 'a' }));

    expect(state.bitesByTripId['a']).toBeUndefined();
    expect(state.entities['a']).toBeDefined();
  });

  it('removes a deleted trip and its Bites', () => {
    const withBites = reducer(
      reducer(initialState, TripActions.loadedMyTrips({ trips: [trip('a')] })),
      TripActions.loadedTripBites({ tripId: 'a', bites: [bite] }),
    );

    const state = reducer(withBites, TripActions.deletedTrip({ tripId: 'a' }));

    expect(state.ids).toEqual([]);
    expect(state.bitesByTripId).toEqual({});
  });

  it('forgets everything on logout', () => {
    const loaded = reducer(
      initialState,
      TripActions.loadedMyTrips({ trips: [trip('a')] }),
    );

    expect(reducer(loaded, fromAuth.AuthActions.logoutSucceeded())).toEqual(
      initialState,
    );
  });
});
