import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { RestaurantTable, Room } from 'model';
import {
  FIRST_ROOM_VERSION,
  FloorPlanDataAccessService,
  TABLE_LABEL_FIELD,
  TABLE_ROOM_FIELD,
} from '../floor-plan-data-access.service';
import {
  FloorPlanConflictError,
  RoomNotEmptyError,
} from '../floor-plan-errors';

jest.mock('@capacitor-firebase/firestore');

type FirestoreCollection = Awaited<
  ReturnType<typeof FirebaseFirestore.getCollection>
>;
type FirestoreDocument = Awaited<
  ReturnType<typeof FirebaseFirestore.getDocument>
>;
type FirestoreAdd = Awaited<ReturnType<typeof FirebaseFirestore.addDocument>>;

const RESTAURANT_ID = 'owned-restaurant';
const ROOM_ID = 'main-room';

const ROOM: Room = {
  id: ROOM_ID,
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 6000 },
  objects: [
    {
      id: 'wall-1',
      type: 'wall',
      position: { x: 4000, y: 0 },
      size: { width: 8000, height: 120 },
      rotation: 0,
    },
  ],
  version: 3,
};

const ROUND_TABLE: RestaurantTable = {
  id: 'table-12',
  label: '12',
  roomId: ROOM_ID,
  position: { x: 2000, y: 3000 },
  rotation: 0,
  seats: 4,
  enabled: true,
  shape: 'round',
  diameter: 900,
};

const asDocument = (id: string, data: unknown): FirestoreDocument =>
  ({ snapshot: { id, data } }) as unknown as FirestoreDocument;

const asCollection = (
  snapshots: { id: string; data: unknown }[],
): FirestoreCollection => ({ snapshots }) as unknown as FirestoreCollection;

describe(FloorPlanDataAccessService.name, () => {
  let service: FloorPlanDataAccessService;

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [FloorPlanDataAccessService],
    });

    service = TestBed.inject(FloorPlanDataAccessService);
  });

  describe('loadRoomPlan', () => {
    /** The acceptance criterion: one room read plus one tables query. */
    it('costs one document read and one query, whatever the plan contains', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument(ROOM_ID, { ...ROOM, id: undefined }));
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(
          asCollection([{ id: ROUND_TABLE.id, data: ROUND_TABLE }]),
        );

      const plan = await service.loadRoomPlan(RESTAURANT_ID, ROOM_ID);

      expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(1);
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/rooms/${ROOM_ID}`,
      });
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledTimes(1);
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/tables`,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: TABLE_ROOM_FIELD,
              opStr: '==',
              value: ROOM_ID,
            },
          ],
        },
      });
      expect(plan?.room.id).toBe(ROOM_ID);
      expect(plan?.tables).toHaveLength(1);
    });

    it('reports a room that is not there rather than an empty plan', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument(ROOM_ID, undefined));
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(asCollection([]));

      await expect(
        service.loadRoomPlan(RESTAURANT_ID, ROOM_ID),
      ).resolves.toBeUndefined();
    });
  });

  describe('loadTableByLabel', () => {
    /**
     * The acceptance criterion of issue #1084: "table 12" resolves to one
     * table, without anybody parsing a plan or scanning a collection.
     */
    it('returns the one table carrying the label', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(
          asCollection([{ id: ROUND_TABLE.id, data: ROUND_TABLE }]),
        );

      const table = await service.loadTableByLabel(RESTAURANT_ID, '12');

      expect(FirebaseFirestore.getCollection).toHaveBeenCalledTimes(1);
      expect(FirebaseFirestore.getCollection).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/tables`,
        compositeFilter: {
          type: 'and',
          queryConstraints: [
            {
              type: 'where',
              fieldPath: TABLE_LABEL_FIELD,
              opStr: '==',
              value: '12',
            },
          ],
        },
      });
      expect(table?.id).toBe('table-12');
      expect(table?.seats).toBe(4);
      expect(table?.roomId).toBe(ROOM_ID);
    });

    it('reports a label nothing carries rather than throwing', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(asCollection([]));

      await expect(
        service.loadTableByLabel(RESTAURANT_ID, '404'),
      ).resolves.toBeUndefined();
    });
  });

  describe('loadRooms', () => {
    it('returns the rooms in the display order the owner chose', async () => {
      jest.spyOn(FirebaseFirestore, 'getCollection').mockResolvedValue(
        asCollection([
          { id: 'terrace', data: { ...ROOM, order: 2 } },
          { id: 'main', data: { ...ROOM, order: 1 } },
        ]),
      );

      const rooms = await service.loadRooms(RESTAURANT_ID);

      expect(rooms.map((room) => room.id)).toEqual(['main', 'terrace']);
    });
  });

  describe('createRoom', () => {
    it('creates the room at the first version and returns its new id', async () => {
      jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValue({ reference: { id: 'new-room' } } as FirestoreAdd);

      const { id, version, ...rest } = ROOM;
      const created = await service.createRoom(RESTAURANT_ID, rest);

      expect(FirebaseFirestore.addDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/rooms`,
        data: { ...rest, version: FIRST_ROOM_VERSION },
      });
      expect(created).toEqual({
        ...rest,
        id: 'new-room',
        version: FIRST_ROOM_VERSION,
      });
      expect(id).toBe(ROOM_ID);
      expect(version).toBe(3);
    });
  });

  describe('saveRoom', () => {
    it('writes the successor of the version it read, and only the room', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      const saved = await service.saveRoom(RESTAURANT_ID, ROOM);

      expect(FirebaseFirestore.setDocument).toHaveBeenCalledTimes(1);
      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/rooms/${ROOM_ID}`,
        data: {
          name: ROOM.name,
          order: ROOM.order,
          size: ROOM.size,
          objects: ROOM.objects,
          version: ROOM.version + 1,
        },
      });
      expect(saved.version).toBe(ROOM.version + 1);
    });

    /** No editor state can ride along into the stored document. */
    it('stores only the fields of a room', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveRoom(RESTAURANT_ID, {
        ...ROOM,
        selected: true,
        dragOffset: { x: 5, y: 5 },
      } as Room);

      const [[call]] = jest.mocked(FirebaseFirestore.setDocument).mock.calls;

      expect(Object.keys(call.data as object).sort()).toEqual([
        'name',
        'objects',
        'order',
        'size',
        'version',
      ]);
    });

    /**
     * The level a room sits on (GitHub issue #1085).
     *
     * Stored only once a room names one, and a room save replaces the whole
     * document - so clearing the field is what removes the field, rather than
     * leaving a level with a blank name behind.
     */
    it('stores a floor only when the room names one', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveRoom(RESTAURANT_ID, { ...ROOM, floor: 'Upstairs' });

      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ floor: 'Upstairs' }),
        }),
      );

      await service.saveRoom(RESTAURANT_ID, { ...ROOM, floor: undefined });

      const calls = jest.mocked(FirebaseFirestore.setDocument).mock.calls;
      const [last] = calls[calls.length - 1];

      expect(last.data as object).not.toHaveProperty('floor');
    });

    it('reports a conflict when the stored room has moved on', async () => {
      jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockRejectedValue(new Error('PERMISSION_DENIED'));
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument(ROOM_ID, { ...ROOM, version: 4 }));

      const error = await service
        .saveRoom(RESTAURANT_ID, ROOM)
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(FloorPlanConflictError);
      expect((error as FloorPlanConflictError).baseVersion).toBe(3);
      expect((error as FloorPlanConflictError).currentRoom?.version).toBe(4);
    });

    it('reports a conflict when the room was deleted while the save was in flight', async () => {
      jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockRejectedValue(new Error('PERMISSION_DENIED'));
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument(ROOM_ID, undefined));

      const error = await service
        .saveRoom(RESTAURANT_ID, ROOM)
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(FloorPlanConflictError);
      expect((error as FloorPlanConflictError).currentRoom).toBeUndefined();
    });

    /**
     * A refusal at the same version is not a race, it is the rules saying no.
     * Dressing it up as a conflict would offer the owner a reload that changes
     * nothing.
     */
    it('rethrows the original error when the stored version still matches', async () => {
      const denied = new Error('PERMISSION_DENIED');

      jest.spyOn(FirebaseFirestore, 'setDocument').mockRejectedValue(denied);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument(ROOM_ID, ROOM));

      await expect(service.saveRoom(RESTAURANT_ID, ROOM)).rejects.toBe(denied);
    });

    it('rethrows the original error when the room cannot be read back either', async () => {
      const denied = new Error('PERMISSION_DENIED');

      jest.spyOn(FirebaseFirestore, 'setDocument').mockRejectedValue(denied);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockRejectedValue(new Error('PERMISSION_DENIED'));

      await expect(service.saveRoom(RESTAURANT_ID, ROOM)).rejects.toBe(denied);
    });
  });

  describe('deleteRoom', () => {
    it('refuses to delete a room that still contains tables', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(
          asCollection([{ id: ROUND_TABLE.id, data: ROUND_TABLE }]),
        );
      jest.spyOn(FirebaseFirestore, 'deleteDocument').mockResolvedValue();

      const error = await service
        .deleteRoom(RESTAURANT_ID, ROOM_ID)
        .catch((thrown: unknown) => thrown);

      expect(error).toBeInstanceOf(RoomNotEmptyError);
      expect((error as RoomNotEmptyError).tableCount).toBe(1);
      expect(FirebaseFirestore.deleteDocument).not.toHaveBeenCalled();
    });

    it('deletes a room once its tables are gone', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(asCollection([]));
      jest.spyOn(FirebaseFirestore, 'deleteDocument').mockResolvedValue();

      await service.deleteRoom(RESTAURANT_ID, ROOM_ID);

      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/rooms/${ROOM_ID}`,
      });
    });
  });

  describe('saveTable', () => {
    it('stores a round table with a diameter and no size', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveTable(RESTAURANT_ID, ROUND_TABLE);

      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/tables/${ROUND_TABLE.id}`,
        data: {
          label: '12',
          roomId: ROOM_ID,
          position: ROUND_TABLE.position,
          rotation: 0,
          seats: 4,
          enabled: true,
          shape: 'round',
          diameter: 900,
        },
      });
    });

    /**
     * Switching a round table to a rectangle in the editor must not leave the
     * diameter behind, or the stored table describes two shapes at once.
     */
    it('drops the fields of the shape a table no longer has', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveTable(RESTAURANT_ID, {
        ...ROUND_TABLE,
        shape: 'rectangle',
        size: { width: 1200, height: 800 },
        diameter: 900,
      } as unknown as RestaurantTable);

      const [[call]] = jest.mocked(FirebaseFirestore.setDocument).mock.calls;

      expect(call.data).not.toHaveProperty('diameter');
      expect(call.data).toHaveProperty('size', { width: 1200, height: 800 });
    });

    it('omits a QR token that has not been issued yet', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveTable(RESTAURANT_ID, ROUND_TABLE);

      const [[call]] = jest.mocked(FirebaseFirestore.setDocument).mock.calls;

      expect(call.data).not.toHaveProperty('qrTokenId');
    });
  });
});
