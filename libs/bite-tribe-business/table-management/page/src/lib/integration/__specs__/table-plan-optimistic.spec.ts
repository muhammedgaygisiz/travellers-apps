import { TableState, TableStatus } from 'model';
import {
  isSuperseded,
  mergeOptimistic,
  OptimisticTransition,
  prunedOptimistic,
} from '../table-plan-optimistic';

const NOW = 1_760_000_000_000;

const state = (
  tableId: string,
  status: TableStatus,
  over: Partial<TableState> = {},
): TableState => ({
  tableId,
  restaurantId: 'restaurant-1',
  status,
  since: NOW,
  updatedByUserId: 'host-1',
  ...over,
});

const live = (...states: TableState[]): ReadonlyMap<string, TableState> =>
  new Map(states.map((entry) => [entry.tableId, entry]));

const pending = (
  tableId: string,
  entry: OptimisticTransition,
): ReadonlyMap<string, OptimisticTransition> => new Map([[tableId, entry]]);

/**
 * What the plan shows between the tap and the server agreeing
 * (GitHub issue #1094).
 */
describe('mergeOptimistic', () => {
  it('leaves the delivered states alone when nothing is in flight', () => {
    const delivered = live(state('table-1', 'occupied'));

    expect(mergeOptimistic(delivered, new Map(), 'restaurant-1')).toBe(
      delivered,
    );
  });

  /** The whole reason the layer exists: the table changes on the tap. */
  it('shows the asked-for status before the server has answered', () => {
    const merged = mergeOptimistic(
      live(state('table-1', 'available')),
      pending('table-1', { status: 'occupied', since: NOW + 1000 }),
      'restaurant-1',
    );

    expect(merged.get('table-1')).toEqual(
      expect.objectContaining({ status: 'occupied', since: NOW + 1000 }),
    );
  });

  /** A table nobody has ever acted on has no document, and still moves. */
  it('invents a state for a table that has never had one', () => {
    const merged = mergeOptimistic(
      new Map(),
      pending('table-7', { status: 'reserved', since: NOW }),
      'restaurant-1',
    );

    expect(merged.get('table-7')).toEqual({
      tableId: 'table-7',
      restaurantId: 'restaurant-1',
      status: 'reserved',
      since: NOW,
      updatedByUserId: '',
    });
  });

  /**
   * The backend replaces the state document rather than merging into it, so a
   * note left by the last party must not appear to survive the table being
   * freed - not even for the second between the tap and the snapshot.
   */
  it('drops the note and the visit the transition is about to clear', () => {
    const merged = mergeOptimistic(
      live(
        state('table-1', 'occupied', {
          note: 'Birthday cake at 21:00',
          visitId: 'visit-1',
        }),
      ),
      pending('table-1', { status: 'available', since: NOW + 1000 }),
      'restaurant-1',
    );

    expect(merged.get('table-1')?.note).toBeUndefined();
    expect(merged.get('table-1')?.visitId).toBeUndefined();
  });

  /**
   * Not when the callable resolves - when the snapshot carrying it arrives.
   * Dropping it a moment early is the flicker that makes staff doubt the
   * screen.
   */
  it('keeps the guess until the listener delivers the transition itself', () => {
    const entry: OptimisticTransition = {
      status: 'occupied',
      since: NOW + 1000,
      confirmedSince: NOW + 1200,
    };

    expect(
      mergeOptimistic(
        live(state('table-1', 'available')),
        pending('table-1', entry),
        'restaurant-1',
      ).get('table-1')?.status,
    ).toBe('occupied');

    expect(
      mergeOptimistic(
        live(state('table-1', 'occupied', { since: NOW + 1200 })),
        pending('table-1', entry),
        'restaurant-1',
      ).get('table-1')?.since,
    ).toBe(NOW + 1200);
  });

  /** Other tables are untouched, however many are in flight. */
  it('leaves every table nobody is acting on exactly as delivered', () => {
    const merged = mergeOptimistic(
      live(state('table-1', 'available'), state('table-2', 'cleaning')),
      pending('table-1', { status: 'occupied', since: NOW }),
      'restaurant-1',
    );

    expect(merged.get('table-2')?.status).toBe('cleaning');
  });
});

describe('isSuperseded', () => {
  /** A call still in flight can never be superseded, whatever arrives. */
  it('never supersedes a transition the server has not answered', () => {
    expect(
      isSuperseded(
        { status: 'occupied', since: NOW },
        state('table-1', 'occupied', { since: NOW + 5000 }),
      ),
    ).toBe(false);
  });

  it('supersedes a confirmed transition once a state that recent arrives', () => {
    const entry: OptimisticTransition = {
      status: 'occupied',
      since: NOW,
      confirmedSince: NOW + 100,
    };

    expect(
      isSuperseded(entry, state('table-1', 'occupied', { since: NOW })),
    ).toBe(false);
    expect(
      isSuperseded(entry, state('table-1', 'occupied', { since: NOW + 100 })),
    ).toBe(true);
  });

  it('supersedes nothing when no state has been delivered at all', () => {
    expect(
      isSuperseded(
        { status: 'occupied', since: NOW, confirmedSince: NOW },
        undefined,
      ),
    ).toBe(false);
  });
});

describe('prunedOptimistic', () => {
  /**
   * Answering nothing rather than a fresh equal map is what keeps the caller
   * from writing a signal once per snapshot for the whole of a service.
   */
  it('answers nothing when every guess is still needed', () => {
    expect(
      prunedOptimistic(
        live(state('table-1', 'available')),
        pending('table-1', { status: 'occupied', since: NOW }),
      ),
    ).toBeUndefined();
  });

  it('drops the guesses the listener has caught up with', () => {
    const next = prunedOptimistic(
      live(
        state('table-1', 'occupied', { since: NOW + 100 }),
        state('table-2', 'available'),
      ),
      new Map([
        [
          'table-1',
          { status: 'occupied', since: NOW, confirmedSince: NOW + 100 },
        ],
        ['table-2', { status: 'cleaning', since: NOW }],
      ]),
    );

    expect(next && [...next.keys()]).toEqual(['table-2']);
  });
});
