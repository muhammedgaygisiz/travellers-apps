import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import {
  FloorPlanConflictError,
  FloorPlanDataAccessService,
  NewRoom,
  RoomNotEmptyError,
} from 'bite-tribe-business/floor-plan-data-access';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  MAX_ITEM_SIDE,
  MIN_ITEM_SIDE,
} from 'bite-tribe-business/floor-plan-ui';
import { FloorPlanObject, RestaurantTable, Room } from 'model';
import { of } from 'rxjs';
import { ToastRequest, ToastService } from 'toast';
import { FloorPlanService } from '../floor-plan.service';

// Only the restaurant name is read this way; the rooms go through the
// data-access mock below.
jest.mock('@capacitor-firebase/firestore');

const getDocument = FirebaseFirestore.getDocument as jest.Mock;

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 4,
  ...over,
});

const wall: FloorPlanObject = {
  id: 'wall-1',
  type: 'wall',
  position: { x: 1000, y: 1000 },
  size: { width: 2000, height: 100 },
  rotation: 0,
};

const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
  ({
    id: 'table-1',
    label: '1',
    roomId: 'room-1',
    shape: 'rectangle',
    size: { width: 1200, height: 800 },
    position: { x: 3000, y: 3000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

describe(FloorPlanService.name, () => {
  let service: FloorPlanService;
  let toasts: ToastRequest[];
  let stored: Room[];
  let restaurantId: ReturnType<typeof signal<string | undefined>>;

  let loadRooms: jest.Mock;
  let createRoom: jest.Mock;
  let saveRoom: jest.Mock;
  let deleteRoom: jest.Mock;
  let loadTables: jest.Mock;
  let saveTable: jest.Mock;
  let deleteTable: jest.Mock;
  let storedTables: RestaurantTable[];

  /**
   * Lets the resources settle before the assertion.
   *
   * A `resource` runs its loader from an effect and resolves through a chain of
   * microtasks, so one flushed effect is not enough — the same shape the home
   * data-access spec uses for its failed reads.
   *
   * Twice around, because the reads are chained: the tables resource is keyed
   * on the room the rooms resource produces, so it does not start until that
   * one has settled and a single round leaves it loading.
   */
  const loaded = async (): Promise<void> => {
    for (let round = 0; round < 2; round += 1) {
      TestBed.tick();

      for (let tick = 0; tick < 20; tick += 1) {
        await Promise.resolve();
      }

      TestBed.tick();
    }
  };

  const messageKeys = (): (string | undefined)[] =>
    toasts.map((toast) => toast.messageKey);

  beforeEach(async () => {
    toasts = [];
    stored = [room()];
    restaurantId = signal<string | undefined>('china-wok');

    getDocument.mockReset();
    getDocument.mockResolvedValue({
      snapshot: { id: 'china-wok', data: { name: 'China Wok' } },
    });

    loadRooms = jest.fn(() => Promise.resolve(stored));
    createRoom = jest.fn((_restaurantId: string, next: NewRoom) =>
      Promise.resolve({ ...next, id: 'room-2', version: 1 } as Room),
    );
    saveRoom = jest.fn((_restaurantId: string, next: Room) =>
      Promise.resolve({ ...next, version: next.version + 1 }),
    );
    deleteRoom = jest.fn(() => Promise.resolve());
    storedTables = [];
    loadTables = jest.fn(() => Promise.resolve(storedTables));
    saveTable = jest.fn((_restaurantId: string, next: RestaurantTable) =>
      Promise.resolve(next),
    );
    deleteTable = jest.fn(() => Promise.resolve());

    TestBed.configureTestingModule({
      providers: [
        FloorPlanService,
        {
          provide: FloorPlanDataAccessService,
          useValue: {
            loadRooms,
            createRoom,
            saveRoom,
            deleteRoom,
            loadTables,
            saveTable,
            deleteTable,
          },
        },
        {
          provide: BiteTribeStoreService,
          useValue: {
            restaurantIdFromUrl: restaurantId,
            isAuthenticated$: of(true),
            logout: jest.fn(),
          },
        },
        {
          provide: ToastService,
          useValue: {
            present: (request: ToastRequest): Promise<void> => {
              toasts.push(request);

              return Promise.resolve();
            },
          },
        },
      ],
    });

    service = TestBed.inject(FloorPlanService);
    await loaded();
  });

  it('reads the rooms of the restaurant in the route', () => {
    expect(loadRooms).toHaveBeenCalledWith('china-wok');
    expect(service.roomsValue()).toEqual(stored);
  });

  it('names the restaurant the plan belongs to', () => {
    expect(service.restaurantName()).toBe('China Wok');
  });

  describe('the restaurant read', () => {
    it('skips the read entirely without a restaurant in the route', async () => {
      getDocument.mockClear();

      await expect(
        service.restaurantLoader({
          params: { restaurantId: undefined },
        } as never),
      ).resolves.toBeUndefined();
      expect(getDocument).not.toHaveBeenCalled();
    });

    it('answers with nothing for a restaurant that is not there', async () => {
      getDocument.mockResolvedValueOnce({ snapshot: { id: 'gone' } });

      await expect(
        service.restaurantLoader({
          params: { restaurantId: 'gone' },
        } as never),
      ).resolves.toBeUndefined();
    });

    it('leaves the page unnamed rather than guessing', async () => {
      getDocument.mockResolvedValue({ snapshot: { id: 'gone' } });
      service.restaurant.reload();
      await loaded();

      expect(service.restaurantName()).toBe('');
    });
  });

  /**
   * A failed read resolves to an empty list through `resourceValue`, so the
   * page needs this to tell "you have no rooms yet" apart from "your rooms are
   * not on screen" (issue #1232).
   */
  it('reports a failed room read as a failure and not as an empty plan', async () => {
    loadRooms.mockRejectedValueOnce(new Error('permission-denied'));
    service.rooms.reload();
    await loaded();

    expect(service.loadFailed()).toBe(true);
    expect(service.roomsValue()).toEqual([]);
  });

  it('reads nothing while the route carries no restaurant', async () => {
    loadRooms.mockClear();
    restaurantId.set(undefined);
    await loaded();

    expect(loadRooms).not.toHaveBeenCalled();
    expect(service.roomsValue()).toEqual([]);
  });

  describe('selecting a room', () => {
    it('opens the first room until the owner picks another', async () => {
      stored = [room(), room({ id: 'room-2', name: 'Terrace', order: 1 })];
      service.rooms.reload();
      await loaded();

      expect(service.selectedRoom()?.id).toBe('room-1');

      service.selectRoom('room-2');

      expect(service.selectedRoom()?.name).toBe('Terrace');
    });

    it('falls back to the first room when the pick no longer exists', async () => {
      service.selectRoom('room-deleted-elsewhere');

      expect(service.selectedRoom()?.id).toBe('room-1');
    });
  });

  describe('creating a room', () => {
    it('stores it after the rooms already there, and opens it', async () => {
      await service.createRoom({ name: 'Terrace', width: 4000, height: 5000 });

      expect(createRoom).toHaveBeenCalledWith('china-wok', {
        name: 'Terrace',
        order: 1,
        size: { width: 4000, height: 5000 },
        objects: [],
      });
      expect(service.selectedRoom()?.id).toBe('room-2');
      expect(messageKeys()).toEqual(['floor-plan-room-created']);
    });

    it('writes nothing while the route carries no restaurant', async () => {
      restaurantId.set(undefined);
      await loaded();

      await service.createRoom({ name: 'Terrace', width: 4000, height: 5000 });

      expect(createRoom).not.toHaveBeenCalled();
    });

    it('reports a failure without losing the rooms already loaded', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      createRoom.mockRejectedValueOnce(new Error('offline'));

      await service.createRoom({ name: 'Terrace', width: 4000, height: 5000 });

      expect(service.roomsValue()).toEqual(stored);
      expect(messageKeys()).toEqual(['floor-plan-room-save-failed']);
    });
  });

  describe('saving a room', () => {
    it('carries the version it was read at, and keeps the geometry', async () => {
      await service.saveRoom({ name: 'Terrace', width: 6000, height: 9000 });

      expect(saveRoom).toHaveBeenCalledWith('china-wok', {
        ...room(),
        name: 'Terrace',
        size: { width: 6000, height: 9000 },
      });
      expect(service.selectedRoom()?.version).toBe(5);
      expect(messageKeys()).toEqual(['floor-plan-room-saved']);
    });

    /**
     * The rejected save of issue #1081 finally has a reader. The stored room
     * comes off the error rather than from a second read, and it goes on
     * screen — an owner who lost the race is shown what is there, not a
     * failure they cannot act on.
     */
    it('shows the stored room when another device saved first', async () => {
      const theirs = room({ name: 'Their name', version: 9 });
      saveRoom.mockRejectedValueOnce(
        new FloorPlanConflictError('room-1', 4, theirs),
      );

      await service.saveRoom({ name: 'Mine', width: 6000, height: 9000 });

      expect(service.selectedRoom()).toEqual(theirs);
      expect(messageKeys()).toEqual(['floor-plan-room-conflict']);
      expect(loadRooms).toHaveBeenCalledTimes(1);
    });

    it('reloads the list when the room was deleted mid-save', async () => {
      stored = [];
      saveRoom.mockRejectedValueOnce(
        new FloorPlanConflictError('room-1', 4, undefined),
      );

      await service.saveRoom({ name: 'Mine', width: 6000, height: 9000 });
      await loaded();

      expect(service.roomsValue()).toEqual([]);
      expect(messageKeys()).toEqual(['floor-plan-room-gone']);
    });

    it('reports anything else as a plain failure', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      saveRoom.mockRejectedValueOnce(new Error('permission-denied'));

      await service.saveRoom({ name: 'Mine', width: 6000, height: 9000 });

      expect(messageKeys()).toEqual(['floor-plan-room-save-failed']);
    });

    it('does nothing when no room is open', async () => {
      stored = [];
      service.rooms.reload();
      await loaded();

      await service.saveRoom({ name: 'Mine', width: 6000, height: 9000 });

      expect(saveRoom).not.toHaveBeenCalled();
    });
  });

  describe('snapping', () => {
    it('moves a saved dimension to the nearest grid line while it is on', async () => {
      await service.saveRoom({ name: 'Terrace', width: 6140, height: 9260 });

      expect(saveRoom.mock.calls[0][1].size).toEqual({
        width: 6000,
        height: 9500,
      });
    });

    it('stores the exact dimension once it is off', async () => {
      service.setSnapEnabled(false);

      await service.saveRoom({ name: 'Terrace', width: 6140, height: 9260 });

      expect(saveRoom.mock.calls[0][1].size).toEqual({
        width: 6140,
        height: 9260,
      });
    });

    it('follows the spacing the owner chose', async () => {
      service.setGridSpacing(1000);

      await service.saveRoom({ name: 'Terrace', width: 6400, height: 9600 });

      expect(saveRoom.mock.calls[0][1].size).toEqual({
        width: 6000,
        height: 10_000,
      });
    });

    /**
     * The acceptance criterion that toggling snapping writes nothing. It
     * decides where the next edit lands and never walks through a plan that is
     * already arranged.
     */
    it('writes nothing when it is toggled', () => {
      service.setSnapEnabled(false);
      service.setSnapEnabled(true);
      service.setGridSpacing(250);

      expect(saveRoom).not.toHaveBeenCalled();
      expect(service.selectedRoom()).toEqual(room());
    });
  });

  describe('deleting a room', () => {
    it('drops it from the list and reopens the first of the rest', async () => {
      await service.deleteRoom(room());

      expect(deleteRoom).toHaveBeenCalledWith('china-wok', 'room-1');
      expect(service.roomsValue()).toEqual([]);
      expect(messageKeys()).toEqual(['floor-plan-room-deleted']);
    });

    it('deletes nothing while the route carries no restaurant', async () => {
      restaurantId.set(undefined);
      await loaded();

      await service.deleteRoom(room());

      expect(deleteRoom).not.toHaveBeenCalled();
    });

    it('says how many tables are in the way, and keeps the room', async () => {
      deleteRoom.mockRejectedValueOnce(new RoomNotEmptyError('room-1', 12));

      await service.deleteRoom(room());

      expect(service.roomsValue()).toEqual(stored);
      expect(toasts).toEqual([
        {
          messageKey: 'floor-plan-room-not-empty',
          params: { count: 12 },
          outcome: 'failure',
        },
      ]);
    });

    it('reports anything else as a plain failure', async () => {
      jest.spyOn(console, 'error').mockImplementation(() => undefined);
      deleteRoom.mockRejectedValueOnce(new Error('offline'));

      await service.deleteRoom(room());

      expect(service.roomsValue()).toEqual(stored);
      expect(messageKeys()).toEqual(['floor-plan-room-delete-failed']);
    });
  });

  describe('editing the plan', () => {
    const idsOf = (): string[] => service.items().map((item) => item.id);

    it('draws the geometry of the open room and the tables beside it', async () => {
      stored = [room({ objects: [wall] })];
      storedTables = [table()];
      service.rooms.reload();
      service.tables.reload();
      await loaded();

      expect(loadTables).toHaveBeenCalledWith('china-wok', 'room-1');
      expect(idsOf()).toEqual(['wall-1', 'table-1']);
    });

    it('places a palette entry and selects it', () => {
      service.place({ variant: 'chair', position: { x: 1240, y: 2760 } });

      expect(service.layout().objects).toHaveLength(1);
      expect(service.selectedIds()).toEqual([service.layout().objects[0].id]);
    });

    it('lands a placement on the grid and inside the room', () => {
      service.place({ variant: 'chair', position: { x: 1240, y: 2760 } });
      service.place({ variant: 'chair', position: { x: 99_000, y: 99_000 } });

      const [first, second] = service.layout().objects;

      expect(first.position).toEqual({ x: 1000, y: 3000 });
      expect(second.position).toEqual({ x: 8000, y: 12_000 });
    });

    it('places a table as a table rather than as geometry', () => {
      service.place({ variant: 'table-round', position: { x: 1000, y: 1000 } });

      expect(service.layout().tables).toHaveLength(1);
      expect(service.layout().objects).toHaveLength(0);
    });

    it('ignores a palette entry it has never heard of', () => {
      service.place({ variant: 'helicopter', position: { x: 0, y: 0 } });

      expect(service.layout()).toEqual({ objects: [], tables: [] });
    });

    /**
     * The acceptance criterion that undo restores the exact prior geometry,
     * rotation included, and that redo puts it back.
     */
    it('undoes and redoes a move down to the millimetre', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });
      const [placed] = service.items();

      service.applyItems([
        { ...placed, position: { x: 2340, y: 4560 }, rotation: 137 },
      ]);
      expect(service.layout().objects[0].position).toEqual({
        x: 2340,
        y: 4560,
      });

      service.undo();
      expect(service.layout().objects[0]).toEqual({
        id: placed.id,
        type: 'chair',
        position: { x: 1000, y: 1000 },
        size: { width: 450, height: 450 },
        rotation: 0,
      });

      service.redo();
      expect(service.layout().objects[0].rotation).toBe(137);
    });

    it('undoes a placement, and stops selecting what is no longer there', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });

      service.undo();

      expect(service.layout().objects).toEqual([]);
      expect(service.selectedIds()).toEqual([]);
    });

    it('says whether there is anything to undo or redo', () => {
      expect(service.canUndo()).toBe(false);
      expect(service.canRedo()).toBe(false);

      service.place({ variant: 'chair', position: { x: 0, y: 0 } });
      expect(service.canUndo()).toBe(true);

      service.undo();
      expect(service.canRedo()).toBe(true);
    });

    /**
     * The acceptance criterion that selection, the grid and the snap toggle are
     * viewport state: none of them is a step an owner can undo.
     */
    it('keeps selecting and the grid out of the history', () => {
      service.place({ variant: 'chair', position: { x: 0, y: 0 } });
      const after = service.layout();

      service.select([]);
      service.selectAll();
      service.setGridSpacing(250);
      service.setSnapEnabled(false);

      service.undo();

      expect(after.objects).toHaveLength(1);
      expect(service.layout().objects).toEqual([]);
      expect(service.canUndo()).toBe(false);
    });

    it('duplicates the selection beside itself, and selects the copies', () => {
      service.place({ variant: 'table-round', position: { x: 1000, y: 1000 } });
      const original = service.selectedIds();

      service.duplicateSelection();

      expect(service.layout().tables).toHaveLength(2);
      expect(service.selectedIds()).not.toEqual(original);
      expect(service.layout().tables[1].position).toEqual({
        x: 1500,
        y: 1500,
      });
    });

    it('deletes the selection and selects nothing after it', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });

      service.deleteSelection();

      expect(service.layout().objects).toEqual([]);
      expect(service.selectedIds()).toEqual([]);
    });

    it('selects everything in the room at once', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });
      service.place({ variant: 'table-round', position: { x: 2000, y: 2000 } });

      service.selectAll();

      expect(service.selectedIds()).toEqual(idsOf());
    });

    it.each([
      ['delete' as const, (): number => service.layout().objects.length, 0],
      ['duplicate' as const, (): number => service.layout().objects.length, 2],
    ])('runs the %p command from the canvas', (command, count, expected) => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });

      service.runCommand(command);

      expect(count()).toBe(expected);
    });

    it('resizes and rotates the one selected item from the inputs', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });

      service.resizeSelected({ width: 1200, height: 700 });
      service.rotateSelected(-90);

      expect(service.layout().objects[0]).toMatchObject({
        size: { width: 1200, height: 700 },
        rotation: 270,
      });
    });

    it('keeps a round table circular however the inputs are filled in', () => {
      service.place({ variant: 'table-round', position: { x: 1000, y: 1000 } });

      service.resizeSelected({ width: 1200, height: 400 });

      expect(service.layout().tables[0]).toMatchObject({ diameter: 1200 });
    });

    it('refuses a side outside the editor limits', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });

      service.resizeSelected({ width: 5, height: 900_000 });

      expect(service.layout().objects[0].size).toEqual({
        width: MIN_ITEM_SIDE,
        height: MAX_ITEM_SIDE,
      });
    });

    it('edits nothing while several items or none are selected', () => {
      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });
      service.selectAll();
      service.place({ variant: 'chair', position: { x: 2000, y: 2000 } });
      service.selectAll();

      const before = service.layout();
      service.resizeSelected({ width: 1200, height: 700 });
      service.rotateSelected(45);

      expect(service.layout()).toBe(before);
    });

    it('notices unsaved changes, and stops once they are written', async () => {
      expect(service.unsavedChanges()).toBe(false);

      service.place({ variant: 'chair', position: { x: 1000, y: 1000 } });
      expect(service.unsavedChanges()).toBe(true);

      await service.saveRoom({ name: 'Main', width: 8000, height: 12_000 });
      await loaded();

      expect(service.unsavedChanges()).toBe(false);
    });
  });

  describe('saving the plan', () => {
    it('writes the geometry on to the room document', async () => {
      service.place({ variant: 'wall', position: { x: 1000, y: 1000 } });

      await service.saveRoom({ name: 'Main', width: 8000, height: 12_000 });

      expect(saveRoom.mock.calls[0][1].objects).toEqual([
        expect.objectContaining({
          type: 'wall',
          position: { x: 1000, y: 1000 },
        }),
      ]);
      expect(saveTable).not.toHaveBeenCalled();
    });

    /**
     * The acceptance criterion that placing a table writes one table document.
     * `saveRoom` sends only the room, so rearranging furniture never rewrites a
     * table, and a table write never touches the room's geometry.
     */
    it('writes a placed table as its own document', async () => {
      service.place({ variant: 'table-round', position: { x: 1000, y: 1000 } });

      await service.saveRoom({ name: 'Main', width: 8000, height: 12_000 });

      expect(saveTable).toHaveBeenCalledTimes(1);
      expect(saveTable.mock.calls[0][1]).toMatchObject({
        shape: 'round',
        roomId: 'room-1',
        label: '1',
      });
      expect(saveRoom.mock.calls[0][1].objects).toEqual([]);
    });

    it('writes only the tables that actually changed', async () => {
      storedTables = [table(), table({ id: 'table-2', label: '2' })];
      service.tables.reload();
      await loaded();

      const [first] = service.items();
      service.applyItems([{ ...first, rotation: 90 }]);

      await service.saveRoom({ name: 'Main', width: 8000, height: 12_000 });

      expect(saveTable).toHaveBeenCalledTimes(1);
      expect(saveTable.mock.calls[0][1].id).toBe('table-1');
    });

    it('deletes the tables the owner removed', async () => {
      storedTables = [table()];
      service.tables.reload();
      await loaded();

      service.selectAll();
      service.deleteSelection();

      await service.saveRoom({ name: 'Main', width: 8000, height: 12_000 });

      expect(deleteTable).toHaveBeenCalledWith('china-wok', 'table-1');
    });

    /**
     * The room document carries the version rule, so it goes first: a save that
     * lost the race must be refused before any table is written.
     */
    it('writes no table when the room save was refused', async () => {
      saveRoom.mockRejectedValueOnce(
        new FloorPlanConflictError('room-1', 4, room({ version: 9 })),
      );
      service.place({ variant: 'table-round', position: { x: 1000, y: 1000 } });

      await service.saveRoom({ name: 'Mine', width: 8000, height: 12_000 });

      expect(saveTable).not.toHaveBeenCalled();
      expect(messageKeys()).toEqual(['floor-plan-room-conflict']);
    });
  });

  it('hands a sign-out to the store rather than doing it itself', () => {
    const store = TestBed.inject(BiteTribeStoreService);

    service.logout();

    expect(store.logout).toHaveBeenCalled();
  });

  it('reports a write as in flight while it runs, and not after', async () => {
    let release: (value: Room) => void = () => undefined;
    saveRoom.mockReturnValueOnce(
      new Promise<Room>((resolve) => {
        release = resolve;
      }),
    );

    const saving = service.saveRoom({
      name: 'Terrace',
      width: 6000,
      height: 9000,
    });

    expect(service.saving()).toBe(true);

    release(room({ version: 5 }));
    await saving;

    expect(service.saving()).toBe(false);
  });
});
