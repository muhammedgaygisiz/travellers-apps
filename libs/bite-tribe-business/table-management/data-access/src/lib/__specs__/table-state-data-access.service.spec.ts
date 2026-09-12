import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { TableState } from 'model';
import { Subscription } from 'rxjs';
import { TableStateDataAccessService } from '../table-state-data-access.service';

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
    const seen: TableState[][] = [];
    const subscription = service
      .tableStates$('restaurant-1')
      .subscribe((states) => seen.push(states));

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

    expect(seen).toEqual([
      [
        {
          tableId: 'table-1',
          restaurantId: 'restaurant-1',
          status: 'occupied',
          since: 1_760_000_000_000,
          updatedByUserId: 'host-1',
        },
      ],
    ]);

    subscription.unsubscribe();
  });

  it('reports an empty restaurant as no states rather than as nothing', () => {
    const seen: TableState[][] = [];
    const subscription = service
      .tableStates$('restaurant-1')
      .subscribe((states) => seen.push(states));

    listener({ snapshots: [] }, undefined);

    expect(seen).toEqual([[]]);

    subscription.unsubscribe();
  });

  /**
   * A dropped connection or a token being refreshed recovers on its own.
   * Completing the stream would leave the view holding the last states it saw
   * with nothing listening for the next.
   */
  it('reports a listener error without ending the stream', () => {
    const seen: TableState[][] = [];
    let completed = false;
    const subscription = service.tableStates$('restaurant-1').subscribe({
      next: (states) => seen.push(states),
      complete: () => {
        completed = true;
      },
    });

    listener(null, new Error('offline'));
    listener({ snapshots: [] }, undefined);

    expect(handleError).toHaveBeenCalledTimes(1);
    expect(completed).toBe(false);
    expect(seen).toEqual([[]]);

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
      });

      expect(callByName).toHaveBeenCalledWith({
        name: 'transitionTableState',
        data: {
          restaurantId: 'restaurant-1',
          tableId: 'table-1',
          status: 'occupied',
          expectedStatus: 'available',
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
        }),
      ).rejects.toEqual({ code: 'functions/aborted' });
    });
  });
});
