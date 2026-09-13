import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { AuthService } from 'ta-firestore';
import type { Subscription } from 'rxjs';
import {
  TableOrderApiService,
  type LiveTableOrders,
} from '../table-order-api/table-order-api.service';
import {
  TableSessionApiService,
  type LiveTableSession,
} from '../table-session-api/table-session-api.service';

// A factory rather than an automock: the plugin object is built by
// `registerPlugin` at import time, so an automock of it has none of the methods
// the listeners below call.
jest.mock('@capacitor-firebase/firestore', () => ({
  FirebaseFirestore: {
    addDocumentSnapshotListener: jest.fn(),
    addCollectionSnapshotListener: jest.fn(),
    removeSnapshotListener: jest.fn(),
  },
}));
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

/**
 * The two documents a guest's phone reads for itself (GitHub issue #1104).
 *
 * Everything else about a table goes through a callable, because a guest may
 * read almost nothing directly. These two they may, and both are listeners
 * rather than reads, because what has to reach the screen within seconds is a
 * change somebody in the restaurant made.
 *
 * What is worth asserting here is not the mapping but the **query**: the rules
 * admit the order list only because it names the caller's uid, so a call site
 * that stopped naming it would not quietly widen - it would be refused, and the
 * guest would read the refusal as an empty list of orders they know they sent.
 */

const RESTAURANT_ID = 'restaurant-1';
const TABLE_ID = 'table-12';
const VISIT_ID = 'visit-1';
const UID = 'guest-alice';

type Callback = (event: unknown, error: unknown) => void;

describe('a guest watching their own table', () => {
  let sessionApi: TableSessionApiService;
  let orderApi: TableOrderApiService;
  let handleError: jest.Mock;
  let documentCallback: Callback;
  let collectionCallback: Callback;

  const addDocument =
    FirebaseFirestore.addDocumentSnapshotListener as jest.Mock;
  const addCollection =
    FirebaseFirestore.addCollectionSnapshotListener as jest.Mock;
  const removeListener = FirebaseFirestore.removeSnapshotListener as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    handleError = jest.fn();

    addDocument.mockImplementation((_options, callback: Callback) => {
      documentCallback = callback;

      return Promise.resolve('document-listener');
    });

    addCollection.mockImplementation((_options, callback: Callback) => {
      collectionCallback = callback;

      return Promise.resolve('collection-listener');
    });

    removeListener.mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ErrorHandler, useValue: { handleError } },
        // Reached only by the callables of issue #1101, which nothing here
        // calls - but it is a constructor dependency of the service under test.
        {
          provide: AuthService,
          useValue: { getUser: (): { uid: string } => ({ uid: UID }) },
        },
      ],
    });

    sessionApi = TestBed.inject(TableSessionApiService);
    orderApi = TestBed.inject(TableOrderApiService);
  });

  describe('their own session', () => {
    it('subscribes to the document the derived name points at', () => {
      sessionApi.session$(RESTAURANT_ID, TABLE_ID, UID).subscribe();

      expect(addDocument).toHaveBeenCalledWith(
        {
          reference: `restaurants/${RESTAURANT_ID}/tableSessions/8_${TABLE_ID}_${UID}`,
        },
        expect.any(Function),
      );
    });

    it('delivers the session it finds', () => {
      const seen: LiveTableSession[] = [];
      sessionApi
        .session$(RESTAURANT_ID, TABLE_ID, UID)
        .subscribe((read) => seen.push(read));

      documentCallback({ snapshot: { data: { status: 'active' } } }, null);

      expect(seen[0]).toEqual({ session: { status: 'active' }, live: true });
    });

    /** A guest who never scanned has none, which is an answer and not a fault. */
    it('delivers nothing at all for a guest with no session here', () => {
      const seen: LiveTableSession[] = [];
      sessionApi
        .session$(RESTAURANT_ID, TABLE_ID, UID)
        .subscribe((read) => seen.push(read));

      documentCallback({ snapshot: { data: null } }, null);

      expect(seen[0]).toEqual({ live: true });
    });
  });

  describe('their own orders', () => {
    const submitted = (id: string, at: number): unknown => ({
      id,
      data: { id, guestUserId: UID, submittedAt: at, total: 12 },
    });

    it('queries one visit for the orders that name this guest', () => {
      orderApi.orders$(RESTAURANT_ID, VISIT_ID, UID).subscribe();

      expect(addCollection).toHaveBeenCalledWith(
        {
          reference: `restaurants/${RESTAURANT_ID}/visits/${VISIT_ID}/orders`,
          compositeFilter: {
            type: 'and',
            queryConstraints: [
              {
                type: 'where',
                fieldPath: 'guestUserId',
                opStr: '==',
                value: UID,
              },
            ],
          },
        },
        expect.any(Function),
      );
    });

    /**
     * Newest first, and sorted here rather than by Firestore: an `orderBy`
     * beside the equality above would need a composite index, and indexes in
     * this repository are deployed by hand.
     */
    it('answers newest first whatever order they arrive in', () => {
      const seen: LiveTableOrders[] = [];
      orderApi
        .orders$(RESTAURANT_ID, VISIT_ID, UID)
        .subscribe((read) => seen.push(read));

      collectionCallback(
        {
          snapshots: [
            submitted('order-1', 1_757_664_000_000),
            submitted('order-2', 1_757_664_600_000),
          ],
        },
        null,
      );

      expect(seen[0].orders.map((order) => order.id)).toEqual([
        'order-2',
        'order-1',
      ]);
    });
  });

  describe('a listener that stops delivering', () => {
    it('reports the error and says the read is no longer live', () => {
      const seen: LiveTableOrders[] = [];
      orderApi
        .orders$(RESTAURANT_ID, VISIT_ID, UID)
        .subscribe((read) => seen.push(read));

      collectionCallback(null, new Error('permission-denied'));

      expect(handleError).toHaveBeenCalled();
      expect(seen[0]).toEqual({ orders: [], live: false });
    });
  });

  /**
   * A native snapshot listener outlives any RxJS teardown of its own accord, so
   * whoever subscribes owns its removal - the rule issue #1310 arrived at after
   * paying for updates nobody read until the process ended.
   */
  describe('who owns the listener', () => {
    it('removes it when the subscription ends', async () => {
      const subscription: Subscription = sessionApi
        .session$(RESTAURANT_ID, TABLE_ID, UID)
        .subscribe();

      await Promise.resolve();
      subscription.unsubscribe();

      expect(removeListener).toHaveBeenCalledWith({
        callbackId: 'document-listener',
      });
    });

    /** The subscription can end before the registration resolves. */
    it('removes one registered after the subscription had already ended', async () => {
      sessionApi
        .session$(RESTAURANT_ID, TABLE_ID, UID)
        .subscribe()
        .unsubscribe();

      await Promise.resolve();

      expect(removeListener).toHaveBeenCalledWith({
        callbackId: 'document-listener',
      });
    });
  });
});
