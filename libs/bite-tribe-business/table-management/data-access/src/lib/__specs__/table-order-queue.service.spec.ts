import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { Subscription } from 'rxjs';
import {
  TableOrderQueueService,
  TableOrderQueueSnapshot,
} from '../table-order-queue.service';

/*
 * Both plugins are replaced outright rather than spied on.
 *
 * `registerPlugin` hands back a proxy whose methods are resolved on access, and
 * a collection-*group* listener is not among the ones the web implementation
 * materialises on it - so `jest.spyOn` refuses the property that exists at
 * runtime. Replacing the module is the shape the rest of this repository uses
 * for a Capacitor plugin in a Node test.
 */
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addCollectionGroupSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
  },
}));

jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

const callByName = FirebaseFunctions.callByName as jest.Mock;
const addCollectionGroupSnapshotListener =
  FirebaseFirestore.addCollectionGroupSnapshotListener as unknown as jest.Mock;
const removeSnapshotListener =
  FirebaseFirestore.removeSnapshotListener as unknown as jest.Mock;

type Listener = (event: unknown, error: unknown) => void;

const snapshot = (
  id: string,
  data: Record<string, unknown>,
): { id: string; data: Record<string, unknown> } => ({ id, data });

describe(TableOrderQueueService.name, () => {
  let service: TableOrderQueueService;
  let handleError: jest.Mock;
  let addListener: jest.Mock;
  let removeListener: jest.Mock;
  let listener: Listener;

  /** Resolves the registration promise the service chains its id off. */
  const settle = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    jest.clearAllMocks();
    handleError = jest.fn();

    addListener = addCollectionGroupSnapshotListener;
    addListener.mockImplementation((_options, callback) => {
      listener = callback as unknown as Listener;

      return Promise.resolve('callback-1');
    });

    removeListener = removeSnapshotListener;
    removeListener.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        TableOrderQueueService,
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });

    service = TestBed.inject(TableOrderQueueService);
  });

  afterEach(() => jest.resetAllMocks());

  describe('reading the queue', () => {
    /**
     * The two constraints are the whole read. The first is the *permission* -
     * `firestore.rules` admits the collection group only when the query proves
     * which restaurant it is about - and the second is what keeps a queue from
     * streaming every order the restaurant has ever taken.
     */
    it('names the restaurant and the open statuses', async () => {
      const subscription = service
        .openOrders$('restaurant-1')
        .subscribe(() => undefined);

      await settle();

      expect(addListener).toHaveBeenCalledWith(
        {
          reference: 'orders',
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'restaurantId',
                opStr: '==',
                value: 'restaurant-1',
              },
              {
                type: 'where',
                fieldPath: 'status',
                opStr: 'in',
                value: ['submitted', 'accepted', 'preparing'],
              },
            ],
          },
        },
        expect.any(Function),
      );

      subscription.unsubscribe();
    });

    /**
     * Newest first, because a queue is worked from the top - and sorted by
     * `submittedAt` rather than by arrival order, since a snapshot without an
     * `orderBy` delivers documents by id and an id says nothing about when
     * anything was ordered.
     */
    it('delivers the orders newest first, with the document id on them', async () => {
      const deliveries: TableOrderQueueSnapshot[] = [];
      const subscription = service
        .openOrders$('restaurant-1')
        .subscribe((delivery) => deliveries.push(delivery));

      await settle();

      listener(
        {
          snapshots: [
            snapshot('old', { submittedAt: 10, status: 'submitted' }),
            snapshot('new', { submittedAt: 30, status: 'submitted' }),
            snapshot('middle', { submittedAt: 20, status: 'accepted' }),
          ],
        },
        undefined,
      );

      expect(deliveries.at(-1)?.orders.map((order) => order.id)).toEqual([
        'new',
        'middle',
        'old',
      ]);
      expect(deliveries.at(-1)?.live).toBe(true);

      subscription.unsubscribe();
    });

    it('leaves out a snapshot carrying no document data', async () => {
      const deliveries: TableOrderQueueSnapshot[] = [];
      const subscription = service
        .openOrders$('restaurant-1')
        .subscribe((delivery) => deliveries.push(delivery));

      await settle();

      listener(
        {
          snapshots: [
            snapshot('a', { submittedAt: 1 }),
            { id: 'gone', data: undefined },
          ],
        },
        undefined,
      );

      expect(deliveries.at(-1)?.orders.map((order) => order.id)).toEqual(['a']);

      subscription.unsubscribe();
    });

    /**
     * A listener that errors is detached by the SDK rather than retried, so
     * what follows is a queue that has silently stopped updating. The orders it
     * last knew about are kept - an emptied list reads as a kitchen with
     * nothing to cook - and only `live` changes.
     */
    it('keeps the last orders and drops live when the listener dies', async () => {
      const deliveries: TableOrderQueueSnapshot[] = [];
      const subscription = service
        .openOrders$('restaurant-1')
        .subscribe((delivery) => deliveries.push(delivery));

      await settle();

      listener({ snapshots: [snapshot('a', { submittedAt: 1 })] }, undefined);
      listener(null, new Error('permission denied'));

      expect(handleError).toHaveBeenCalled();
      expect(deliveries.at(-1)?.orders.map((order) => order.id)).toEqual(['a']);
      expect(deliveries.at(-1)?.live).toBe(false);

      subscription.unsubscribe();
    });

    /**
     * A native snapshot listener outlives any RxJS teardown of its own accord,
     * so the listener belongs to the subscription and the subscription ending
     * removes it.
     */
    it('removes the listener when the subscription ends', async () => {
      const subscription = service
        .openOrders$('restaurant-1')
        .subscribe(() => undefined);

      await settle();
      subscription.unsubscribe();

      expect(removeListener).toHaveBeenCalledWith({ callbackId: 'callback-1' });
    });

    /**
     * A staff member who opens the queue and goes back before the registration
     * resolves. The teardown records that it ran, and the registration removes
     * the listener it was too late to hand over.
     */
    it('removes a listener registered after the subscription ended', async () => {
      const subscription: Subscription = service
        .openOrders$('restaurant-1')
        .subscribe(() => undefined);

      subscription.unsubscribe();
      await settle();

      expect(removeListener).toHaveBeenCalledWith({ callbackId: 'callback-1' });
    });

    it('reports a listener it cannot remove rather than raising it', async () => {
      removeListener.mockRejectedValue(new Error('gone'));

      const subscription = service
        .openOrders$('restaurant-1')
        .subscribe(() => undefined);

      await settle();
      subscription.unsubscribe();
      await settle();

      expect(handleError).toHaveBeenCalled();
    });
  });

  describe('moving an order', () => {
    it('calls the one callable that may write a status', async () => {
      callByName.mockResolvedValue({ data: { to: 'accepted' } });

      const result = await service.transition({
        restaurantId: 'restaurant-1',
        visitId: 'visit-1',
        orderId: 'order-1',
        status: 'accepted',
        expectedStatus: 'submitted',
      });

      expect(callByName).toHaveBeenCalledWith({
        name: 'transitionTableOrderStatus',
        data: {
          restaurantId: 'restaurant-1',
          visitId: 'visit-1',
          orderId: 'order-1',
          status: 'accepted',
          expectedStatus: 'submitted',
        },
      });
      expect(result).toEqual({ to: 'accepted' });
    });

    /**
     * Rejects rather than swallowing: every failure changes what is on screen,
     * and a service returning `undefined` would leave the caller unable to tell
     * a race from an order somebody deleted.
     */
    it('lets a refusal reach the caller', async () => {
      callByName.mockRejectedValue({ code: 'functions/aborted' });

      await expect(
        service.transition({
          restaurantId: 'restaurant-1',
          visitId: 'visit-1',
          orderId: 'order-1',
          status: 'accepted',
          expectedStatus: 'submitted',
        }),
      ).rejects.toEqual({ code: 'functions/aborted' });
    });
  });
});
