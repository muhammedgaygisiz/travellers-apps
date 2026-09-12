import { signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TranslocoService } from '@jsverse/transloco';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FloorPlanDataAccessService } from 'bite-tribe-business/floor-plan-data-access';
import { TableStateDataAccessService } from 'bite-tribe-business/table-management-data-access';
import { RestaurantTable, Room, TableState, TableStatus } from 'model';
import { BehaviorSubject, of } from 'rxjs';
import { ToastService } from 'toast';
import { TablePlanService } from '../table-plan.service';

const NOW = 1_760_000_000_000;

const room = (id: string, name: string, order: number): Room => ({
  id,
  name,
  order,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 1,
});

const table = (id: string, roomId: string): RestaurantTable => ({
  id,
  label: id.replace('table-', ''),
  roomId,
  position: { x: 1500, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
});

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

/**
 * The live view during service (GitHub issue #1093).
 *
 * Everything here is a read. The one thing the whole surface must never do is
 * write the floor plan, so the data access is a set of spies and the absence of
 * a call is asserted rather than assumed.
 */
describe(TablePlanService.name, () => {
  let service: TablePlanService;
  let states: BehaviorSubject<TableState[]>;
  let floorPlan: Record<string, jest.Mock>;
  let transition: jest.Mock;
  let present: jest.Mock;
  let logout: jest.Mock;
  let getDocument: jest.SpyInstance;
  let currentRestaurantId: WritableSignal<string | undefined>;
  const restaurantId = new BehaviorSubject<string | undefined>('restaurant-1');

  /**
   * Lets the resources notice a changed parameter, run their loader and settle.
   *
   * Three rounds rather than one: a `resource` reloads from an effect, so the
   * parameter change, the loader's promise and the status it resolves to are
   * three separate turns of the microtask queue.
   */
  const settle = async (): Promise<void> => {
    for (let round = 0; round < 3; round += 1) {
      TestBed.tick();
      await Promise.resolve();
      await Promise.resolve();
    }

    TestBed.tick();
  };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(NOW);
    states = new BehaviorSubject<TableState[]>([]);
    logout = jest.fn();
    present = jest.fn().mockResolvedValue(undefined);
    transition = jest
      .fn()
      .mockImplementation(({ tableId, status, expectedStatus }) =>
        Promise.resolve({
          restaurantId: 'restaurant-1',
          tableId,
          from: expectedStatus,
          to: status,
          since: NOW + 500,
          transitionId: `transition-${tableId}`,
        }),
      );
    currentRestaurantId = signal<string | undefined>('restaurant-1');
    restaurantId.next('restaurant-1');

    // The restaurant is read for its name alone, and through Firestore rather
    // than the floor-plan data access, so it is stubbed apart from the plan.
    getDocument = jest
      .spyOn(FirebaseFirestore, 'getDocument')
      .mockResolvedValue({
        snapshot: { id: 'restaurant-1', data: { name: 'Trattoria Roma' } },
      } as unknown as Awaited<
        ReturnType<typeof FirebaseFirestore.getDocument>
      >);

    floorPlan = {
      loadRooms: jest
        .fn()
        .mockResolvedValue([
          room('room-1', 'Dining', 0),
          room('room-2', 'Terrace', 1),
        ]),
      loadTables: jest
        .fn()
        .mockResolvedValue([
          table('table-1', 'room-1'),
          table('table-2', 'room-1'),
          table('table-9', 'room-2'),
        ]),
      saveRoom: jest.fn(),
      saveTable: jest.fn(),
      saveDraft: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        TablePlanService,
        { provide: FloorPlanDataAccessService, useValue: floorPlan },
        {
          provide: TableStateDataAccessService,
          useValue: {
            tableStates$: jest.fn(() => states.asObservable()),
            transition,
          },
        },
        { provide: ToastService, useValue: { present } },
        {
          provide: BiteTribeStoreService,
          useValue: {
            restaurantIdFromUrl: currentRestaurantId,
            restaurantIdFromUrl$: restaurantId.asObservable(),
            isAuthenticated$: of(true),
            logout,
          },
        },
        {
          provide: TranslocoService,
          useValue: {
            langChanges$: of('en'),
            getActiveLang: (): string => 'en',
            translate: (
              key: string,
              params?: Record<string, number>,
            ): string =>
              params === undefined ? key : `${key}:${params['minutes']}`,
          },
        },
      ],
    });

    service = TestBed.inject(TablePlanService);
    await settle();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('opens on the first room without anybody choosing one', () => {
    expect(service.selectedRoom()?.id).toBe('room-1');
  });

  /**
   * A page headed "Tables" showing a room called "Terrace" does not say whose
   * terrace it is, and a staff account may work at a restaurant whose name is
   * the only thing distinguishing it from the last shift.
   */
  it('names the restaurant the room belongs to', () => {
    expect(getDocument).toHaveBeenCalledWith({
      reference: 'restaurants/restaurant-1',
    });
    expect(service.restaurantName()).toBe('Trattoria Roma');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('names nothing when the restaurant document is gone', async () => {
    getDocument.mockResolvedValue({ snapshot: undefined } as unknown as Awaited<
      ReturnType<typeof FirebaseFirestore.getDocument>
    >);
    currentRestaurantId.set('restaurant-2');
    await settle();

    expect(service.restaurantName()).toBe('');
  });

  /**
   * The route parameter is absent for one frame on a cold start, and nothing
   * may be read against a restaurant nobody has named yet.
   */
  it('reads nothing before the route names a restaurant', async () => {
    getDocument.mockClear();
    currentRestaurantId.set(undefined);
    restaurantId.next(undefined);
    await settle();

    expect(service.roomsValue()).toEqual([]);
    expect(service.tablesValue()).toEqual([]);
    expect(service.restaurantName()).toBe('');
    expect(getDocument).not.toHaveBeenCalled();
  });

  it('draws only the tables of the open room', () => {
    expect(service.items().map((item) => item.id)).toEqual([
      'table-1',
      'table-2',
    ]);
  });

  it('switches rooms without reading anything again', () => {
    service.selectRoom('room-2');

    expect(service.selectedRoom()?.id).toBe('room-2');
    expect(service.items().map((item) => item.id)).toEqual(['table-9']);
    expect(floorPlan['loadTables']).toHaveBeenCalledTimes(1);
  });

  /**
   * The acceptance criterion the whole view turns on: a change made on another
   * device is on this one without anything being asked for again.
   */
  it('redraws when a state arrives from another device', () => {
    expect(service.items()[0].status).toBe('available');

    states.next([state('table-1', 'occupied')]);

    expect(service.items()[0].status).toBe('occupied');
    expect(service.items()[0].statusLabel).toBe('table-status-occupied');
  });

  it('counts the open room for the summary bar', () => {
    states.next([state('table-1', 'occupied')]);

    expect(service.summary()).toEqual([
      { status: 'available', count: 1 },
      { status: 'occupied', count: 1 },
      { status: 'reserved', count: 0 },
      { status: 'cleaning', count: 0 },
    ]);
  });

  /**
   * A plan drawn before the first snapshot is a plan of defaults, and a room
   * where everything looks free has to be distinguishable from a room nothing
   * has been heard about yet.
   */
  it('says whether what is on screen is live', () => {
    expect(service.isLive()).toBe(true);
  });

  /**
   * A failed read resolves to an empty list through `resourceValue`, and a page
   * that took that at face value would tell staff their restaurant has no rooms
   * in the middle of a service. Either read failing is the terminal state.
   */
  it.each([['loadRooms'], ['loadTables']])(
    'reports a failed %s as a failure rather than as an empty room',
    async (reader) => {
      expect(service.loadFailed()).toBe(false);

      floorPlan[reader].mockRejectedValue(new Error('offline'));
      currentRestaurantId.set('restaurant-2');
      await settle();

      expect(service.loadFailed()).toBe(true);
    },
  );

  it('advances the time in state as the clock moves', () => {
    states.next([state('table-1', 'occupied', { since: NOW - 60_000 })]);

    expect(service.items()[0].statusDuration).toBe(
      'table-status-elapsed-minutes:1',
    );

    jest.setSystemTime(NOW + 4 * 60_000);
    jest.advanceTimersByTime(30_000);

    expect(service.items()[0].statusDuration).toBe(
      'table-status-elapsed-minutes:5',
    );
  });

  it('runs no clock on a free table', () => {
    expect(service.items()[0].statusDuration).toBeUndefined();
  });

  describe('selection', () => {
    it('describes the one table staff picked', () => {
      states.next([state('table-1', 'cleaning', { note: 'Wobbly leg' })]);
      service.select(['table-1']);

      expect(service.selectedTable()).toEqual(
        expect.objectContaining({
          status: 'cleaning',
          statusLabel: 'table-status-cleaning',
          note: 'Wobbly leg',
        }),
      );
    });

    /**
     * Selecting a wall in the editor is how it is moved; on this view it would
     * open a detail panel about a wall.
     */
    it('refuses to select anything that is not a table', () => {
      service.select(['wall-1']);

      expect(service.selectedIds()).toEqual([]);
      expect(service.selectedTable()).toBeUndefined();
    });

    it('describes nothing while several are selected', () => {
      service.select(['table-1', 'table-2']);

      expect(service.selectedTable()).toBeUndefined();
    });

    /** A held table is a picked table, which is what #1094 opens its sheet on. */
    it('picks the table a long press landed on', () => {
      service.activateTable('table-2');

      expect(service.selectedIds()).toEqual(['table-2']);
    });

    /**
     * The selection belongs to the room it was made in: keeping it would leave
     * the detail panel describing a table in a room that is no longer on
     * screen.
     */
    it('drops the selection when the room changes', () => {
      service.select(['table-1']);
      service.selectRoom('room-2');

      expect(service.selectedIds()).toEqual([]);
    });

    it('puts the detail away on request', () => {
      service.select(['table-1']);
      service.clearSelection();

      expect(service.selectedIds()).toEqual([]);
      expect(service.selectedTable()).toBeUndefined();
    });

    /** A table with no note and a stopped clock still describes itself. */
    it('describes a free table without a clock or a note', () => {
      service.select(['table-1']);

      expect(service.selectedTable()).toEqual(
        expect.objectContaining({ status: 'available' }),
      );
      expect(service.selectedTable()?.duration).toBeUndefined();
      expect(service.selectedTable()?.note).toBeUndefined();
    });
  });

  /**
   * The actions (GitHub issue #1094).
   *
   * The backend is the only writer, so everything here is about what the view
   * sends it, what the view shows meanwhile, and what it does when the answer
   * is no.
   */
  describe('acting on a table', () => {
    /**
     * A held table opens the sheet, which is the criterion about one
     * interaction: the table and its actions are one gesture apart.
     */
    it('opens the actions on the table a long press landed on', () => {
      service.activateTable('table-1');

      expect(service.actionTarget()?.table.id).toBe('table-1');
      expect(service.selectedIds()).toEqual(['table-1']);
    });

    /**
     * The criterion that matters most: a disallowed transition is not offered
     * rather than offered and then rejected.
     */
    it('offers only what the table can currently do', () => {
      states.next([state('table-1', 'cleaning')]);
      service.activateTable('table-1');

      expect(service.actions().map((action) => action.to)).toEqual([
        'available',
        'disabled',
      ]);
    });

    /** A table somebody else moves re-offers itself under the open sheet. */
    it('re-offers the table when it changes under the sheet', () => {
      service.activateTable('table-1');
      expect(service.actions().map((action) => action.to)).toContain(
        'occupied',
      );

      states.next([state('table-1', 'disabled')]);

      expect(service.actions().map((action) => action.to)).toEqual([
        'available',
      ]);
    });

    it('closes the sheet on request and on a cleared selection', () => {
      service.activateTable('table-1');
      service.closeActions();
      expect(service.actionTarget()).toBeUndefined();

      service.activateTable('table-1');
      service.clearSelection();
      expect(service.actionTarget()).toBeUndefined();
    });

    /**
     * The expected status is what turns a race into a sentence, and it is the
     * status the view was showing at the moment the button was pressed.
     */
    it('asks the backend to move the table from what it was showing', async () => {
      states.next([state('table-1', 'occupied')]);
      service.activateTable('table-1');
      await service.applyAction({ to: 'cleaning' });

      expect(transition).toHaveBeenCalledWith({
        restaurantId: 'restaurant-1',
        tableId: 'table-1',
        status: 'cleaning',
        expectedStatus: 'occupied',
      });
      expect(service.actionTarget()).toBeUndefined();
    });

    /**
     * The count has nowhere durable to live until the visit of issue #1095,
     * and the audit entry's reason is the field whose purpose is why a
     * transition happened.
     */
    it('records a party size on the audit entry', async () => {
      service.activateTable('table-1');
      await service.applyAction({ to: 'occupied', guests: 4 });

      expect(transition).toHaveBeenCalledWith(
        expect.objectContaining({ reason: 'Party of 4' }),
      );
    });

    it('sends no reason when no count was entered', async () => {
      service.activateTable('table-1');
      await service.applyAction({ to: 'occupied' });

      expect(transition).toHaveBeenCalledWith(
        expect.not.objectContaining({ reason: expect.anything() }),
      );
    });

    /**
     * The table changes on the tap, because a plan that waits for the round
     * trip reads as a tap that missed - and is answered with a second tap the
     * backend then refuses.
     */
    it('shows the new status before the backend has answered', async () => {
      let settle: (value: unknown) => void = () => undefined;

      transition.mockReturnValue(
        new Promise((resolve) => {
          settle = resolve;
        }),
      );

      service.activateTable('table-1');
      const applied = service.applyAction({ to: 'occupied' });

      expect(service.items()[0].status).toBe('occupied');

      settle({ since: NOW + 500 });
      await applied;
    });

    /**
     * Not when the callable resolves - when the snapshot carrying it arrives.
     * Dropping the guess early is the flicker that makes staff doubt the
     * screen.
     */
    it('keeps it on screen until the listener delivers the same thing', async () => {
      service.activateTable('table-1');
      await service.applyAction({ to: 'occupied' });

      expect(service.items()[0].status).toBe('occupied');

      states.next([state('table-1', 'occupied', { since: NOW + 500 })]);

      expect(service.items()[0].status).toBe('occupied');
      expect(service.items()[0].statusDuration).toBeDefined();
    });

    /**
     * The rollback is a deletion, because the true status was never
     * overwritten - it is still underneath.
     */
    it('rolls back and says who got there first on a conflict', async () => {
      states.next([state('table-1', 'available')]);
      transition.mockRejectedValue({
        code: 'functions/aborted',
        message: 'The table is occupied now, not available.',
      });

      service.activateTable('table-1');
      await service.applyAction({ to: 'occupied' });

      expect(service.items()[0].status).toBe('available');
      expect(present).toHaveBeenCalledWith({
        messageKey: 'table-action-conflict',
        outcome: 'failure',
      });
    });

    it.each([
      ['functions/failed-precondition', 'table-action-not-allowed'],
      ['functions/permission-denied', 'table-action-permission'],
      ['functions/internal', 'table-action-failed'],
    ])('explains %s in its own words', async (code, messageKey) => {
      transition.mockRejectedValue({ code, message: '' });

      service.activateTable('table-1');
      await service.applyAction({ to: 'occupied' });

      expect(service.items()[0].status).toBe('available');
      expect(present).toHaveBeenCalledWith({ messageKey, outcome: 'failure' });
    });

    it('asks for nothing when the sheet is not open', async () => {
      await service.applyAction({ to: 'occupied' });

      expect(transition).not.toHaveBeenCalled();
    });
  });

  /** The end-of-service reset (GitHub issue #1094). */
  describe('the batch', () => {
    it('starts empty and leaves empty', () => {
      service.select(['table-1']);
      service.toggleBulkMode();

      expect(service.bulkMode()).toBe(true);
      expect(service.selectedIds()).toEqual([]);

      service.select(['table-1']);
      service.toggleBulkMode();

      expect(service.bulkMode()).toBe(false);
      expect(service.selectedIds()).toEqual([]);
    });

    /**
     * The canvas reports every read-only tap as "this table alone", because a
     * shift-click is not a gesture a host holding a tablet has. The toggle is
     * the service's.
     */
    it('adds and removes a table per tap while assembling one', () => {
      service.toggleBulkMode();

      service.select(['table-1']);
      service.select(['table-2']);
      expect(service.selectedIds()).toEqual(['table-1', 'table-2']);

      service.select(['table-1']);
      expect(service.selectedIds()).toEqual(['table-2']);

      // Tapping the plan beside a table clears, in both modes.
      service.select([]);
      expect(service.selectedIds()).toEqual([]);
    });

    /** A held table is one more table in the batch, not one to act on alone. */
    it('opens no sheet while a batch is being assembled', () => {
      service.toggleBulkMode();
      service.activateTable('table-1');

      expect(service.actionTarget()).toBeUndefined();
      expect(service.selectedIds()).toEqual(['table-1']);
    });

    it('takes the whole open room in one press', () => {
      service.toggleBulkMode();
      service.selectAllInRoom();

      expect(service.selectedIds()).toEqual(['table-1', 'table-2']);
    });

    /**
     * A table already free has nothing to reset and a party still ordering is
     * not one anybody meant to clear, so neither is sent to the backend to be
     * refused.
     */
    it('counts only the tables the reset would actually free', () => {
      states.next([state('table-1', 'occupied'), state('table-2', 'ordering')]);
      service.toggleBulkMode();
      service.selectAllInRoom();

      expect(service.selectedCount()).toBe(2);
      expect(service.freeableCount()).toBe(1);
    });

    it('frees every table in the batch that can be freed', async () => {
      states.next([
        state('table-1', 'occupied'),
        state('table-2', 'awaitingPayment'),
      ]);
      service.toggleBulkMode();
      service.selectAllInRoom();
      await service.freeSelectedTables();

      expect(transition).toHaveBeenCalledTimes(2);
      expect(transition).toHaveBeenCalledWith(
        expect.objectContaining({
          tableId: 'table-2',
          status: 'available',
          expectedStatus: 'awaitingPayment',
        }),
      );
      expect(service.selectedIds()).toEqual([]);
      expect(present).toHaveBeenCalledWith({
        messageKey: 'table-bulk-freed',
        params: { count: 2 },
        outcome: 'success',
      });
    });

    /**
     * One toast for the batch rather than one per table, and a batch that half
     * worked has to say so - the tables it could not free are still on the
     * plan, showing what they are actually doing.
     */
    it('says how much of a half-finished reset worked', async () => {
      states.next([state('table-1', 'occupied'), state('table-2', 'occupied')]);
      transition.mockRejectedValueOnce({ code: 'functions/aborted' });

      service.toggleBulkMode();
      service.selectAllInRoom();
      await service.freeSelectedTables();

      expect(present).toHaveBeenLastCalledWith({
        messageKey: 'table-bulk-freed-partial',
        params: { count: 1, total: 2 },
        outcome: 'failure',
      });
    });

    it('does nothing when the batch has nothing to free', async () => {
      service.toggleBulkMode();
      service.selectAllInRoom();
      await service.freeSelectedTables();

      expect(transition).not.toHaveBeenCalled();
      expect(present).not.toHaveBeenCalled();
    });
  });

  it('signs the account out', () => {
    service.logout();

    expect(logout).toHaveBeenCalledTimes(1);
  });

  /**
   * The acceptance criterion that is easiest to lose and hardest to notice:
   * the view never writes the floor plan. Nothing in the surface calls a
   * writer, and the rules would refuse a state write anyway - this asserts the
   * first half.
   */
  it('never writes the plan', () => {
    states.next([state('table-1', 'occupied')]);
    service.selectRoom('room-2');
    service.select(['table-9']);
    service.activateTable('table-9');

    expect(floorPlan['saveRoom']).not.toHaveBeenCalled();
    expect(floorPlan['saveTable']).not.toHaveBeenCalled();
    expect(floorPlan['saveDraft']).not.toHaveBeenCalled();
  });
});
