import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { TableState } from 'model';
import { Subscription } from 'rxjs';
import {
  TableStateDataAccessService,
  TableStateSnapshot,
} from '../table-state-data-access.service';

// The Firestore plugin is spied on in place below; the functions plugin has no
// callable to spy on in a Node test, so it is replaced outright.
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;

type Listener = (event: unknown, error: unknown) => void;

describe(TableStateDataAccessService.name, () => {
  let service: TableStateDataAccessService;
  let handleError: jest.Mock;
  let addListener: jest.SpyInstance;
  let removeListener: jest.SpyInstance;
  let listener: Listener;

  /** Resolves the registration promise the service chains its id off. */
  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    handleError = jest.fn();

    addListener = jest
      .spyOn(FirebaseFirestore, 'addCollectionSnapshotListener')
      .mockImplementation((_options, callback) => {
        listener = callback as unknown as Listener;

        return Promise.resolve('callback-1');
      });

    removeListener = jest
      .spyOn(FirebaseFirestore, 'removeSnapshotListener')
      .mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        TableStateDataAccessService,
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });

    service = TestBed.inject(TableStateDataAccessService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('listens to the restaurant, not to one room', () => {
    const subscription = service.tableStates$('restaurant-1').subscribe();

    expect(addListener.mock.calls[0][0]).toEqual({
      reference: 'restaurants/restaurant-1/tableStates',
    });

    subscription.unsubscribe();
  });

  it('reports every state in the snapshot, named by its document', () => {
    const seen: TableStateSnapshot[] = [];
    const subscription = service
      .tableStates$('restaurant-1')
      .subscribe((snapshot) => seen.push(snapshot));

    listener(
      {
        snapshots: [
          {
            id: 'table-1',
            data: {
              restaurantId: 'restaurant-1',
              status: 'occupied',
              since: 1_760_000_000_000,
              updatedByUserId: 'host-1',
            },
          },
        ],
      },
      undefined,
    );

    const states: TableState[] = [
      {
        tableId: 'table-1',
        restaurantId: 'restaurant-1',
        status: 'occupied',
        since: 1_760_000_000_000,
        updatedByUserId: 'host-1',
      },
    ];

    expect(seen).toEqual([{ states, at: expect.any(Number), live: true }]);

    subscription.unsubscribe();
  });

  it('reports an empty restaurant as no states rather than as nothing', () => {
    const seen: TableStateSnapshot[] = [];
    const subscription = service
      .tableStates$('restaurant-1')
      .subscribe((snapshot) => seen.push(snapshot));

    listener({ snapshots: [] }, undefined);

    expect(seen).toEqual([{ states: [], at: expect.any(Number), live: true }]);

    subscription.unsubscribe();
  });

  /** The arrival time is what the staff view measures staleness against. */
  it('stamps each delivery with the moment it arrived', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_760_000_123_000);

    const seen: TableStateSnapshot[] = [];
    const subscription = service
      .tableStates$('restaurant-1')
      .subscribe((snapshot) => seen.push(snapshot));

    listener({ snapshots: [] }, undefined);

    expect(seen[0].at).toBe(1_760_000_123_000);

    subscription.unsubscribe();
  });

  /**
   * Completing the stream would leave the view holding the last states it saw
   * with nothing listening for the next, and no way to say so. The states stay
   * and `live` comes off them, which is what the indicator renders
   * (GitHub issue #1096).
   */
  it('reports a listener error as a feed that is no longer live', () => {
    const seen: TableStateSnapshot[] = [];
    let completed = false;
    const subscription = service.tableStates$('restaurant-1').subscribe({
      next: (snapshot) => seen.push(snapshot),
      complete: () => {
        completed = true;
      },
    });

    listener(
      {
        snapshots: [
          {
            id: 'table-1',
            data: {
              restaurantId: 'restaurant-1',
              status: 'occupied',
              since: 1_760_000_000_000,
              updatedByUserId: 'host-1',
            },
          },
        ],
      },
      undefined,
    );
    listener(null, new Error('listener died'));

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    expect(seen).toHaveLength(2);
    // The room is still drawn from what was last heard; only the claim that it
    // is current comes off.
    expect(seen[1].states).toEqual(seen[0].states);
    expect(seen[1].at).toBe(seen[0].at);
    expect(seen[1].live).toBe(false);

    subscription.unsubscribe();
  });

  /** A delivery after a failure puts the feed back on its feet. */
  it('goes live again when a snapshot follows an error', () => {
    const seen: TableStateSnapshot[] = [];
    const subscription = service
      .tableStates$('restaurant-1')
      .subscribe((snapshot) => seen.push(snapshot));

    listener(null, new Error('listener died'));
    listener({ snapshots: [] }, undefined);

    expect(seen.map(({ live }) => live)).toEqual([false, true]);

    subscription.unsubscribe();
  });

  /**
   * A native snapshot listener outlives any RxJS teardown of its own accord, so
   * a subscription that ends without removing it keeps billing for updates
   * nobody reads (issue #1310).
   */
  it('removes the listener when the subscription ends', async () => {
    const subscription: Subscription = service
      .tableStates$('restaurant-1')
      .subscribe();

    await settle();
    subscription.unsubscribe();

    expect(removeListener).toHaveBeenCalledWith({ callbackId: 'callback-1' });
  });

  /** The subscription can end before the registration resolves. */
  it('removes a listener that arrived after the subscription ended', async () => {
    service.tableStates$('restaurant-1').subscribe().unsubscribe();

    await settle();

    expect(removeListener).toHaveBeenCalledWith({ callbackId: 'callback-1' });
  });

  it('reports a listener it could not remove and carries on', async () => {
    removeListener.mockRejectedValue(new Error('bridge gone'));

    const subscription = service.tableStates$('restaurant-1').subscribe();

    await settle();
    subscription.unsubscribe();
    await settle();

    expect(handleError).toHaveBeenCalled();
  });

  /**
   * The one write, and it is not a write to Firestore (GitHub issue #1094).
   *
   * `transitionTableState` is the only writer of the collection this service
   * listens to, and `firestore.rules` refuses every client write to it - so a
   * `set` here would not fail review, it would fail at the database.
   */
  describe('asking the backend to move a table', () => {
    it('calls the one callable that may write the state', async () => {
      callByName.mockResolvedValue({
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          from: 'available',
          to: 'occupied',
          since: 1_760_000_000_000,
          transitionId: 'transition-1',
        },
      });

      const result = await service.transition({
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        status: 'occupied',
        expectedStatus: 'available',
        requestId: 'request-1',
      });

      // The idempotency key travels with every attempt (issue #1096), which is
      // what lets the backend answer a replay with what the first attempt
      // recorded instead of seating the table twice.
      expect(callByName).toHaveBeenCalledWith({
        name: 'transitionTableState',
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          status: 'occupied',
          expectedStatus: 'available',
          requestId: 'request-1',
        },
      });
      expect(result.since).toBe(1_760_000_000_000);
    });

    /**
     * Rejects rather than swallowing: every failure here changes what is on
     * screen, and a caller that could not tell a conflict from a refusal would
     * have nothing to roll back to or to say.
     */
    it('lets a refusal reach the caller', async () => {
      callByName.mockRejectedValue({ code: 'functions/aborted' });

      await expect(
        service.transition({
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          status: 'occupied',
          expectedStatus: 'available',
          requestId: 'request-1',
        }),
      ).rejects.toEqual({ code: 'functions/aborted' });
    });
  });
});
