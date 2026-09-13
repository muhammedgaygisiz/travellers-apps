import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FloorPlanDataAccessService } from 'bite-tribe-business/floor-plan-data-access';
import {
  OrderAlertService,
  TableOrderQueueService,
  TableOrderQueueSnapshot,
} from 'bite-tribe-business/table-management-data-access';
import type { RestaurantTable, TableOrder } from 'model';
import type { OrderAction, OrderTableGroup } from '../order-queue-groups';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastService } from 'toast';
import { OrderQueueService } from '../order-queue.service';

/**
 * The queue as staff work it (GitHub issue #1105).
 *
 * Everything reachable from a press is here: which buttons a row offers, what a
 * cancellation has to collect before anything is sent, what each backend
 * refusal is turned into, and what the header says when the listener stops
 * delivering. The data access is a spy, because what is under test is the
 * decisions this service makes about it rather than the plugin underneath.
 */

const NOW = Date.parse('2026-09-16T19:30:00.000Z');
const MINUTE = 60_000;

const table = (id: string, label: string): RestaurantTable =>
  ({
    id,
    label,
    roomId: 'room-1',
    position: { x: 0, y: 0 },
    rotation: 0,
    seats: 4,
    enabled: true,
    shape: 'round',
    diameter: 900,
  }) as unknown as RestaurantTable;

const order = (id: string, overrides: Partial<TableOrder> = {}): TableOrder =>
  ({
    id,
    restaurantId: 'restaurant-1',
    visitId: 'visit-1',
    tableId: 'table-12',
    sessionId: 'session-1',
    guestUserId: 'guest-1',
    status: 'submitted',
    lines: [
      { menuItemId: 'item-1', name: 'Margherita', price: 12, quantity: 1 },
    ],
    currency: 'EUR',
    total: 12,
    submittedAt: NOW - MINUTE,
    statusChangedAt: NOW - MINUTE,
    ...overrides,
  }) as TableOrder;

/**
 * Lets the resource loaders, the listener subscription and the effects settle.
 *
 * Effects have to be flushed by hand here, unlike in the app: the alert watches
 * the arriving ids in an `effect`, and an assertion made before the flush would
 * be asserting about a delivery Angular has not looked at yet.
 */
const settle = async (): Promise<void> => {
  for (let round = 0; round < 3; round += 1) {
    TestBed.tick();
    await Promise.resolve();
    await Promise.resolve();
  }

  TestBed.tick();
};

describe(OrderQueueService.name, () => {
  let service: OrderQueueService;
  let feed: Subject<TableOrderQueueSnapshot>;
  let transition: jest.Mock;
  let present: jest.Mock;
  let alertEnabled: WritableSignal<boolean>;
  let alert: jest.Mock;
  let setEnabled: jest.Mock;
  let restaurantId: BehaviorSubject<string | undefined>;

  const deliver = (
    orders: TableOrder[],
    over: Partial<TableOrderQueueSnapshot> = {},
  ): void => {
    feed.next({ orders, at: Date.now(), live: true, ...over });
    TestBed.tick();
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);

    // A plain `Subject`, not a `BehaviorSubject`: "nothing has arrived yet" is
    // a state the queue has to be able to report, and a subject that replays an
    // empty delivery would make the screen say the kitchen is up to date before
    // it has heard anything at all.
    feed = new Subject<TableOrderQueueSnapshot>();
    transition = jest.fn().mockResolvedValue({});
    present = jest.fn().mockResolvedValue(undefined);
    alertEnabled = signal(false);
    alert = jest.fn();
    setEnabled = jest.fn().mockImplementation(async (enabled: boolean) => {
      alertEnabled.set(enabled);
    });
    restaurantId = new BehaviorSubject<string | undefined>('restaurant-1');

    TestBed.configureTestingModule({
      providers: [
        OrderQueueService,
        {
          provide: TableOrderQueueService,
          useValue: {
            openOrders$: jest.fn(() => feed.asObservable()),
            transition,
          },
        },
        {
          provide: FloorPlanDataAccessService,
          useValue: {
            loadTables: jest
              .fn()
              .mockResolvedValue([table('table-12', '12'), table('t5', '5')]),
          },
        },
        {
          provide: OrderAlertService,
          useValue: {
            enabled: alertEnabled,
            restore: jest.fn().mockResolvedValue(undefined),
            setEnabled,
            alert,
          },
        },
        { provide: ToastService, useValue: { present } },
        {
          provide: BiteTribeStoreService,
          useValue: {
            restaurantIdFromUrl: signal<string | undefined>('restaurant-1'),
            restaurantIdFromUrl$: restaurantId.asObservable(),
            isAuthenticated$: of(true),
            logout: jest.fn(),
          },
        },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: of('en'),
            getActiveLang: (): string => 'en',
            translate: (key: string): string => key,
          },
        },
      ],
    });

    service = TestBed.inject(OrderQueueService);
    await settle();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('groups what has arrived, and names the tables', async () => {
    deliver([order('a'), order('b', { tableId: 't5' })]);

    expect(service.groups().map((group) => group.label)).toEqual(['12', '5']);
    expect(service.openCount()).toBe(2);
  });

  /**
   * An empty list drawn from no delivery at all is indistinguishable from a
   * kitchen with nothing to cook, and a pass has to be able to tell them apart.
   */
  it('says it is connecting until the first delivery', () => {
    expect(service.liveStatus()).toBe('connecting');
    expect(service.loading()).toBe(true);
  });

  it('says it is live once orders are arriving', () => {
    deliver([]);

    expect(service.liveStatus()).toBe('live');
    expect(service.loading()).toBe(false);
  });

  /**
   * A listener the SDK detached delivers nothing, exactly like a quiet kitchen.
   * The queue keeps what it had and stops calling itself current.
   */
  it('reports a dead listener rather than emptying the queue', () => {
    deliver([order('a')]);
    feed.next({ orders: [order('a')], at: NOW, live: false });

    expect(service.groups()).toHaveLength(1);
    expect(service.liveStatus()).toBe('offline');
  });

  it('calls itself out of date once the last delivery is old enough', () => {
    feed.next({ orders: [], at: NOW - 5 * MINUTE, live: false });
    jest.setSystemTime(NOW + 5 * MINUTE);
    jest.advanceTimersByTime(30_000);

    expect(service.liveStatus()).toBe('stale');
  });

  describe('moving an order along', () => {
    it('sends the status the row was showing as the expectation', async () => {
      deliver([order('a', { status: 'accepted' })]);

      const [group] = service.groups();

      await service.pick(group, 'a', group.orders[0].actions[0], 'accepted');

      expect(transition).toHaveBeenCalledWith({
        restaurantId: 'restaurant-1',
        visitId: 'visit-1',
        orderId: 'a',
        status: 'preparing',
        expectedStatus: 'accepted',
      });
    });

    /**
     * One row at a time and by id, so a slow call on table 12 leaves the rest
     * of the pass working.
     */
    it('marks only the pressed row busy while the call is in flight', async () => {
      deliver([order('a'), order('b')]);

      let release: (() => void) | undefined;

      transition.mockImplementation(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      );

      const [group] = service.groups();
      const pending = service.pick(
        group,
        'a',
        group.orders[0].actions[0],
        'submitted',
      );

      expect(service.busyOrderId()).toBe('a');

      release?.();
      await pending;

      expect(service.busyOrderId()).toBeUndefined();
    });

    it.each([
      ['aborted', 'order-action-conflict'],
      ['failed-precondition', 'order-action-not-allowed'],
      ['not-found', 'order-action-not-found'],
      ['permission-denied', 'order-action-permission'],
      ['internal', 'order-action-failed'],
    ])('explains %s in its own words', async (code, messageKey) => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      deliver([order('a')]);
      transition.mockRejectedValue({ code: `functions/${code}` });

      const [group] = service.groups();

      await service.pick(group, 'a', group.orders[0].actions[0], 'submitted');

      expect(present).toHaveBeenCalledWith({ messageKey, outcome: 'failure' });
    });
  });

  describe('cancelling', () => {
    /**
     * The cancel button of a row, as the matrix produced it. Thrown rather than
     * asserted away, so a matrix that stopped offering it fails here with a
     * sentence rather than further down with `undefined`.
     */
    const cancelAction = (group: OrderTableGroup, id: string): OrderAction => {
      const action = group.orders
        .find((entry) => entry.id === id)
        ?.actions.find((entry) => entry.to === 'cancelled');

      if (!action) {
        throw new Error(`Order ${id} offers no cancellation.`);
      }

      return action;
    };

    /**
     * Nothing is sent until somebody has typed a sentence. The backend refuses
     * a reasonless cancellation too; this is what stops that refusal ever being
     * what a kitchen sees.
     */
    it('asks for a reason instead of sending', async () => {
      deliver([order('a')]);

      const [group] = service.groups();

      await service.pick(group, 'a', cancelAction(group, 'a'), 'submitted');

      expect(transition).not.toHaveBeenCalled();
      expect(service.pendingCancellation()).toEqual({
        visitId: 'visit-1',
        orderId: 'a',
        label: '12',
      });
    });

    it('sends the reason once it has one', async () => {
      deliver([order('a')]);

      const [group] = service.groups();

      await service.pick(group, 'a', cancelAction(group, 'a'), 'submitted');
      await service.confirmCancellation('We have run out of sea bass.');

      expect(transition).toHaveBeenCalledWith({
        restaurantId: 'restaurant-1',
        visitId: 'visit-1',
        orderId: 'a',
        status: 'cancelled',
        expectedStatus: 'submitted',
        reason: 'We have run out of sea bass.',
      });
      expect(service.pendingCancellation()).toBeUndefined();
    });

    /**
     * The dialog is open for as long as somebody takes to type, so the
     * expectation is read when the cancellation is sent rather than when it was
     * started - otherwise every slow typist would hit a conflict.
     */
    it('expects the status the order holds now, not when the dialog opened', async () => {
      deliver([order('a')]);

      const [group] = service.groups();

      await service.pick(group, 'a', cancelAction(group, 'a'), 'submitted');
      deliver([order('a', { status: 'preparing' })]);
      await service.confirmCancellation('Burnt.');

      expect(transition).toHaveBeenCalledWith(
        expect.objectContaining({ expectedStatus: 'preparing' }),
      );
    });

    it('sends nothing when the cancellation is abandoned', async () => {
      deliver([order('a')]);

      const [group] = service.groups();

      await service.pick(group, 'a', cancelAction(group, 'a'), 'submitted');
      service.dismissCancellation();
      await service.confirmCancellation('Too late.');

      expect(transition).not.toHaveBeenCalled();
    });

    /**
     * The order left the queue while the reason was being typed - somebody else
     * served it. There is nothing to cancel, and nothing is sent.
     */
    it('sends nothing when the order has gone in the meantime', async () => {
      deliver([order('a')]);

      const [group] = service.groups();

      await service.pick(group, 'a', cancelAction(group, 'a'), 'submitted');
      deliver([]);
      await service.confirmCancellation('Gone.');

      expect(transition).not.toHaveBeenCalled();
    });
  });

  describe('the busy-service alert', () => {
    /**
     * The first delivery is silent. Opening the screen at the start of a shift
     * would otherwise announce the whole pass at once, which says nothing about
     * what just happened.
     */
    it('stays quiet on the first delivery', () => {
      deliver([order('a'), order('b')]);

      expect(alert).not.toHaveBeenCalled();
      expect(service.justArrived()).toBe(false);
    });

    it('announces an order that was not there before', () => {
      deliver([order('a')]);
      deliver([order('a'), order('b')]);

      expect(alert).toHaveBeenCalledTimes(1);
      expect(service.justArrived()).toBe(true);
    });

    /**
     * Watched by id rather than by count, so pressing Served - which shortens
     * the queue - and the delivery that follows it are silent.
     */
    it('says nothing when an order leaves the queue', () => {
      deliver([order('a'), order('b')]);
      deliver([order('a')]);

      expect(alert).not.toHaveBeenCalled();
    });

    it('says nothing when an order only changes status', () => {
      deliver([order('a')]);
      deliver([order('a', { status: 'accepted' })]);

      expect(alert).not.toHaveBeenCalled();
    });

    it('remembers the toggle for this device', async () => {
      await service.toggleAlert();

      expect(setEnabled).toHaveBeenCalledWith(true);
      expect(service.alertEnabled()).toBe(true);
    });
  });

  it('reports no label failure while the numbers are readable', () => {
    expect(service.labelsFailed()).toBe(false);
  });
});

/**
 * A pass that can see the dishes and not the table numbers is worse than one
 * with both and far better than one with neither, so a failed table read says
 * so and leaves the queue drawing.
 *
 * Its own `describe` because it needs a different injector: the resource is
 * created when the service is, and a loader swapped afterwards would be swapped
 * after the read it is meant to fail.
 */
describe('when the table numbers cannot be read', () => {
  let service: OrderQueueService;
  let feed: Subject<TableOrderQueueSnapshot>;

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    feed = new Subject<TableOrderQueueSnapshot>();

    TestBed.configureTestingModule({
      providers: [
        OrderQueueService,
        {
          provide: TableOrderQueueService,
          useValue: {
            openOrders$: jest.fn(() => feed.asObservable()),
            transition: jest.fn(),
          },
        },
        {
          provide: FloorPlanDataAccessService,
          useValue: {
            loadTables: jest.fn().mockRejectedValue(new Error('offline')),
          },
        },
        {
          provide: OrderAlertService,
          useValue: {
            enabled: signal(false),
            restore: jest.fn().mockResolvedValue(undefined),
            setEnabled: jest.fn(),
            alert: jest.fn(),
          },
        },
        { provide: ToastService, useValue: { present: jest.fn() } },
        {
          provide: BiteTribeStoreService,
          useValue: {
            restaurantIdFromUrl: signal<string | undefined>('restaurant-1'),
            restaurantIdFromUrl$: new BehaviorSubject<string | undefined>(
              'restaurant-1',
            ).asObservable(),
            isAuthenticated$: of(true),
            logout: jest.fn(),
          },
        },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: of('en'),
            getActiveLang: (): string => 'en',
            translate: (key: string): string => key,
          },
        },
      ],
    });

    service = TestBed.inject(OrderQueueService);
    await settle();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('says so, and still draws every order it has', () => {
    feed.next({ orders: [order('a')], at: NOW, live: true });
    TestBed.tick();

    expect(service.labelsFailed()).toBe(true);
    expect(service.groups()).toHaveLength(1);
    expect(service.groups()[0].label).toBe('');
  });
});
