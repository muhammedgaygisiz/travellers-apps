import type { Bite, Trip } from 'model';
import { adapter, initialState, TripsState } from '../adapter';
import { sortedTrips, tripBites, tripById } from '../selectors';

const trip = (id: string, startDate: string, title = id): Trip => ({
  id,
  userId: 'owner',
  title,
  startDate,
});

const stateWith = (
  trips: Trip[],
  bitesByTripId: Record<string, Bite[]> = {},
): { trips: TripsState } => ({
  trips: { ...adapter.setAll(trips, initialState), bitesByTripId },
});

describe('trips selectors', () => {
  it('orders trips by start date, newest first, then by title', () => {
    const state = stateWith([
      trip('a', '2025-06-01'),
      trip('b', '2026-12-01', 'Vietnam'),
      trip('c', '2026-12-01', 'Thailand'),
    ]);

    expect(sortedTrips(state).map(({ id }) => id)).toEqual(['c', 'b', 'a']);
  });

  it('finds a trip by id', () => {
    const state = stateWith([trip('a', '2026-12-01')]);

    expect(tripById('a')(state)?.id).toBe('a');
    expect(tripById('missing')(state)).toBeUndefined();
  });

  it("returns a trip's Bites, and undefined before they are read", () => {
    const bites = [{ id: 'bite-1' } as Bite];
    const state = stateWith([trip('a', '2026-12-01')], { a: bites });

    expect(tripBites('a')(state)).toBe(bites);
    expect(tripBites('b')(state)).toBeUndefined();
  });
});
