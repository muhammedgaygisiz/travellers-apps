import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { TableOrderApiService, TableSessionApiService } from 'bite-tribe/api';
import { AuthService } from 'ta-firestore';
import type { TableOrder, TableSession } from 'model';
import { BehaviorSubject } from 'rxjs';
import {
  TABLE_ORDER_CLOSED_KEYS,
  TABLE_ORDER_STATUS_KEYS,
  TableOrderHistoryService,
} from '../table-order-history.service';

/**
 * What the guest has already ordered, and whether they may order again
 * (GitHub issue #1104).
 *
 * Three claims are held open here, and none of them is about arithmetic.
 *
 * **The chain.** The phone knows a restaurant and a table. Everything else -
 * which visit, which orders - is reached through the session document, so a
 * screen reopened an hour into a meal finds the orders again with nothing
 * carried over from the submission that placed them.
 *
 * **The party's dinner stays private** (`RD-TS-12`). The order query names the
 * caller's uid, which is what the rules admit it by; a query that stopped
 * naming it would not quietly widen, it would be refused - but the call site is
 * checked here because that refusal would reach a guest as an empty list.
 *
 * **Silence is never reported as good news.** A listener the SDK detached
 * delivers nothing, exactly like a quiet table, so the difference has to travel
 * with the data.
 */

const RESTAURANT_ID = 'restaurant-1';
const TABLE_ID = 'table-12';
const UID = 'guest-alice';

const SESSION: TableSession = {
  id: '8_table-12_guest-alice',
  restaurantId: RESTAURANT_ID,
  tableId: TABLE_ID,
  guestUserId: UID,
  status: 'active',
  visitId: 'visit-1',
  startedAt: 1_757_664_000_000,
  lastActiveAt: 1_757_664_000_000,
  isAnonymousGuest: true,
};

const order = (over: Partial<TableOrder> = {}): TableOrder => ({
  id: 'order-1',
  restaurantId: RESTAURANT_ID,
  visitId: 'visit-1',
  tableId: TABLE_ID,
  sessionId: SESSION.id,
  guestUserId: UID,
  status: 'submitted',
  lines: [
    {
      menuItemId: 'item-margherita',
      name: 'Margherita',
      price: 12,
      currency: 'EUR',
      quantity: 1,
    },
  ],
  currency: 'EUR',
  total: 12,
  submittedAt: 1_757_664_000_000,
  statusChangedAt: 1_757_664_000_000,
  ...over,
});

describe(TableOrderHistoryService.name, () => {
  let service: TableOrderHistoryService;
  let session$: BehaviorSubject<{ session?: TableSession; live: boolean }>;
  let orders$: BehaviorSubject<{ orders: TableOrder[]; live: boolean }>;
  let sessionFor: jest.Mock;
  let ordersFor: jest.Mock;
  let uid: string | undefined;

  beforeEach(() => {
    uid = UID;
    session$ = new BehaviorSubject<{ session?: TableSession; live: boolean }>({
      session: SESSION,
      live: true,
    });
    orders$ = new BehaviorSubject<{ orders: TableOrder[]; live: boolean }>({
      orders: [],
      live: true,
    });
    sessionFor = jest.fn().mockReturnValue(session$);
    ordersFor = jest.fn().mockReturnValue(orders$);

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        TableOrderHistoryService,
        {
          provide: TableSessionApiService,
          useValue: { session$: sessionFor },
        },
        { provide: TableOrderApiService, useValue: { orders$: ordersFor } },
        {
          provide: AuthService,
          useValue: {
            getUser: (): { uid: string } | undefined =>
              uid ? { uid } : undefined,
          },
        },
      ],
    });

    service = TestBed.inject(TableOrderHistoryService);
  });

  describe('finding the orders', () => {
    it('derives the session document from the table and the guest', () => {
      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(sessionFor).toHaveBeenCalledWith(RESTAURANT_ID, TABLE_ID, UID);
    });

    /**
     * The visit id is read off the session rather than carried from the
     * submission, which is what makes the screen survive a reload at a table.
     */
    it('follows the session to the visit its orders live under', () => {
      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(ordersFor).toHaveBeenCalledWith(RESTAURANT_ID, 'visit-1', UID);
    });

    /** A guest waiting to be seated has no visit, and has ordered nothing. */
    it('listens to no orders while the session is pending', () => {
      session$.next({
        session: { ...SESSION, status: 'pending', visitId: undefined },
        live: true,
      });

      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(ordersFor).not.toHaveBeenCalled();
      expect(service.hasOrders()).toBe(false);
    });

    it('attaches the moment staff open the visit', () => {
      session$.next({
        session: { ...SESSION, status: 'pending', visitId: undefined },
        live: true,
      });
      service.watch(RESTAURANT_ID, TABLE_ID);

      session$.next({ session: SESSION, live: true });

      expect(ordersFor).toHaveBeenCalledWith(RESTAURANT_ID, 'visit-1', UID);
    });

    /**
     * The screen is public and the anonymous sign-in belongs to the scan before
     * it, so the first call can arrive with nobody signed in. It must not
     * subscribe to a document named after an empty uid.
     */
    it('watches nothing until there is a guest to watch as', () => {
      uid = undefined;

      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(sessionFor).not.toHaveBeenCalled();
    });

    it('attaches on the call after the guest is signed in', () => {
      uid = undefined;
      service.watch(RESTAURANT_ID, TABLE_ID);

      uid = UID;
      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(sessionFor).toHaveBeenCalledTimes(1);
    });

    it('does not restart the listeners on a repeated call', () => {
      service.watch(RESTAURANT_ID, TABLE_ID);
      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(sessionFor).toHaveBeenCalledTimes(1);
      expect(ordersFor).toHaveBeenCalledTimes(1);
    });
  });

  describe('what it shows', () => {
    beforeEach(() => service.watch(RESTAURANT_ID, TABLE_ID));

    it('has nothing to show before the guest orders', () => {
      expect(service.hasOrders()).toBe(false);
      expect(service.total()).toBe(0);
    });

    it('shows what the listener delivers', () => {
      orders$.next({ orders: [order()], live: true });

      expect(service.orders()).toHaveLength(1);
      expect(service.total()).toBe(12);
    });

    /** A dish that will not be cooked will not be billed. */
    it('leaves a cancelled order out of the running total', () => {
      orders$.next({
        orders: [
          order(),
          order({ id: 'order-2', status: 'cancelled', total: 30 }),
        ],
        live: true,
      });

      expect(service.orders()).toHaveLength(2);
      expect(service.total()).toBe(12);
    });

    it('carries a status change through within the delivery it arrives in', () => {
      orders$.next({ orders: [order()], live: true });
      orders$.next({ orders: [order({ status: 'preparing' })], live: true });

      expect(service.orders()[0].status).toBe('preparing');
    });
  });

  describe('whether a further order is possible', () => {
    it('says yes on an active session', () => {
      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(service.acceptsOrders()).toBe(true);
      expect(service.status()).toBe('active');
    });

    it.each(['pending', 'left', 'expired', 'closed'] as const)(
      'says no on a %s session',
      (status) => {
        session$.next({ session: { ...SESSION, status }, live: true });

        service.watch(RESTAURANT_ID, TABLE_ID);

        expect(service.acceptsOrders()).toBe(false);
        expect(TABLE_ORDER_CLOSED_KEYS[status]).toBeTruthy();
      },
    );

    /** Unknown is not the same as ended. The backend answers that one. */
    it('says yes when this guest has no session document at all', () => {
      session$.next({ live: true });

      service.watch(RESTAURANT_ID, TABLE_ID);

      expect(service.status()).toBeUndefined();
      expect(service.acceptsOrders()).toBe(true);
    });
  });

  describe('a listener that stopped delivering', () => {
    beforeEach(() => service.watch(RESTAURANT_ID, TABLE_ID));

    it('is not stale while both are delivering', () => {
      expect(service.isStale()).toBe(false);
    });

    it('says so when the orders stop arriving', () => {
      orders$.next({ orders: [order()], live: false });

      expect(service.isStale()).toBe(true);
    });

    it('says so when the session stops arriving', () => {
      session$.next({ session: SESSION, live: false });

      expect(service.isStale()).toBe(true);
    });

    /**
     * An errored delivery carries no documents and must not read as a guest who
     * ordered nothing: the list stays and only the warning changes.
     */
    it('keeps the orders it last knew about', () => {
      orders$.next({ orders: [order()], live: true });
      orders$.next({ orders: [order()], live: false });

      expect(service.orders()).toHaveLength(1);
    });
  });

  /**
   * The listeners belong to the screen. A guest who walks out of the restaurant
   * with the tab open would otherwise keep paying the restaurant's bill for
   * document reads nobody is looking at.
   */
  it('ends both listeners when the screen goes', () => {
    service.watch(RESTAURANT_ID, TABLE_ID);

    expect(session$.observed).toBe(true);
    expect(orders$.observed).toBe(true);

    TestBed.resetTestingModule();

    expect(session$.observed).toBe(false);
    expect(orders$.observed).toBe(false);
  });

  it('has a sentence for every status an order can hold', () => {
    expect(Object.values(TABLE_ORDER_STATUS_KEYS).every(Boolean)).toBe(true);
    expect(Object.keys(TABLE_ORDER_STATUS_KEYS)).toHaveLength(5);
  });
});
