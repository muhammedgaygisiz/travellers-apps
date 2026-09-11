import { TestBed } from '@angular/core/testing';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { RestaurantTable, Room } from 'model';
import { FloorPlanDraft } from 'model';
import {
  FIRST_ROOM_VERSION,
  FloorPlanDataAccessService,
  TABLE_LABEL_FIELD,
  TABLE_ROOM_FIELD,
} from '../floor-plan-data-access.service';
import {
  FloorPlanConflictError,
  FloorPlanDraftConflictError,
  RoomNotEmptyError,
} from '../floor-plan-errors';

jest.mock('@capacitor-firebase/firestore');
// Auto-mocking the plugin leaves it without `callByName` in this environment,
// so the one method this service calls is declared here.
jest.mock('@capacitor-firebase/functions', () => ({
  FirebaseFunctions: { callByName: jest.fn() },
}));

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

const DRAFT_REFERENCE = `restaurants/${RESTAURANT_ID}/rooms/${ROOM_ID}/drafts/current`;

const DRAFT: FloorPlanDraft = {
  name: 'Main dining room',
  size: { width: 8000, height: 6000 },
  objects: [],
  tables: [ROUND_TABLE],
  revision: 2,
  updatedAt: 1_700_000_000_000,
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
    /**
     * The acceptance criterion: the plan costs a fixed number of reads however
     * many objects are drawn. Two documents since issue #1088 rather than one,
     * because the draft is a document of its own - which is what keeps it out
     * of every read of the published room.
     */
    it('costs two document reads and one query, whatever the plan contains', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument(ROOM_ID, { ...ROOM, id: undefined }));
      jest
        .spyOn(FirebaseFirestore, 'getCollection')
        .mockResolvedValue(
          asCollection([{ id: ROUND_TABLE.id, data: ROUND_TABLE }]),
        );

      const plan = await service.loadRoomPlan(RESTAURANT_ID, ROOM_ID);

      expect(FirebaseFirestore.getDocument).toHaveBeenCalledTimes(2);
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/rooms/${ROOM_ID}`,
      });
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: DRAFT_REFERENCE,
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

  /**
   * The draft: a document of its own under the room (GitHub issue #1088).
   */
  describe('the draft', () => {
    it('reads it from the drafts subcollection of the room', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument('current', DRAFT));

      await expect(service.loadDraft(RESTAURANT_ID, ROOM_ID)).resolves.toEqual(
        DRAFT,
      );
      expect(FirebaseFirestore.getDocument).toHaveBeenCalledWith({
        reference: DRAFT_REFERENCE,
      });
    });

    /** A room nobody is halfway through rearranging has no draft, and that is
     * an ordinary answer rather than a failure. */
    it('answers with nothing for a room that has no draft', async () => {
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument('current', undefined));

      await expect(
        service.loadDraft(RESTAURANT_ID, ROOM_ID),
      ).resolves.toBeUndefined();
    });

    it('writes the successor of the revision it read, and stamps the time', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();
      jest.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

      const saved = await service.saveDraft(
        RESTAURANT_ID,
        ROOM_ID,
        {
          name: 'Main dining room',
          size: { width: 8000, height: 6000 },
          objects: [],
          tables: [ROUND_TABLE],
        },
        2,
      );

      expect(saved.revision).toBe(3);
      expect(saved.updatedAt).toBe(1_700_000_000_000);
      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith({
        reference: DRAFT_REFERENCE,
        data: expect.objectContaining({ revision: 3 }),
      });
    });

    /** The same reason `saveRoom` writes a room field by field: a transient
     * editor field riding on a table object would otherwise reach Firestore
     * through the draft. */
    it('stores only the fields of a room and its tables', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveDraft(
        RESTAURANT_ID,
        ROOM_ID,
        {
          name: 'Main dining room',
          size: { width: 8000, height: 6000 },
          objects: [],
          tables: [
            { ...ROUND_TABLE, dragging: true } as unknown as RestaurantTable,
          ],
        },
        0,
      );

      const [[call]] = jest.mocked(FirebaseFirestore.setDocument).mock.calls;
      const data = call.data as FloorPlanDraft;

      expect(Object.keys(data.tables[0])).not.toContain('dragging');
      expect(data.tables[0].id).toBe(ROUND_TABLE.id);
      expect('floor' in data).toBe(false);
    });

    it('reports a conflict when another device wrote the draft first', async () => {
      jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockRejectedValue(new Error('permission-denied'));
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument('current', { ...DRAFT, revision: 9 }));

      await expect(
        service.saveDraft(
          RESTAURANT_ID,
          ROOM_ID,
          { name: 'x', size: { width: 1, height: 1 }, objects: [], tables: [] },
          2,
        ),
      ).rejects.toBeInstanceOf(FloorPlanDraftConflictError);
    });

    it('rethrows the original error when the stored revision still matches', async () => {
      const denied = new Error('permission-denied');

      jest.spyOn(FirebaseFirestore, 'setDocument').mockRejectedValue(denied);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument('current', DRAFT));

      await expect(
        service.saveDraft(
          RESTAURANT_ID,
          ROOM_ID,
          { name: 'x', size: { width: 1, height: 1 }, objects: [], tables: [] },
          DRAFT.revision,
        ),
      ).rejects.toBe(denied);
    });

    it('stores a floor only when the draft names one', async () => {
      jest.spyOn(FirebaseFirestore, 'setDocument').mockResolvedValue();

      await service.saveDraft(
        RESTAURANT_ID,
        ROOM_ID,
        {
          name: 'Terrace',
          floor: 'Upstairs',
          size: { width: 1, height: 1 },
          objects: [],
          tables: [],
        },
        0,
      );

      expect(FirebaseFirestore.setDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ floor: 'Upstairs' }),
        }),
      );
    });

    /** The other device discarded the draft rather than writing one, which is
     * still a race this one lost. */
    it('reports a conflict when the stored draft is gone', async () => {
      jest
        .spyOn(FirebaseFirestore, 'setDocument')
        .mockRejectedValue(new Error('permission-denied'));
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockResolvedValue(asDocument('current', undefined));

      const rejection = await service
        .saveDraft(
          RESTAURANT_ID,
          ROOM_ID,
          { name: 'x', size: { width: 1, height: 1 }, objects: [], tables: [] },
          2,
        )
        .catch((error: unknown) => error);

      expect(rejection).toBeInstanceOf(FloorPlanDraftConflictError);
      expect(
        (rejection as FloorPlanDraftConflictError).currentDraft,
      ).toBeUndefined();
      expect(String(rejection)).toContain('gone');
    });

    /** The read failed too, so nothing can be said about the revision - and the
     * write's own error describes that better than a guess would. */
    it('rethrows the original error when the draft cannot be read back either', async () => {
      const denied = new Error('permission-denied');

      jest.spyOn(FirebaseFirestore, 'setDocument').mockRejectedValue(denied);
      jest
        .spyOn(FirebaseFirestore, 'getDocument')
        .mockRejectedValue(new Error('offline'));

      await expect(
        service.saveDraft(
          RESTAURANT_ID,
          ROOM_ID,
          { name: 'x', size: { width: 1, height: 1 }, objects: [], tables: [] },
          2,
        ),
      ).rejects.toBe(denied);
    });

    /** Deleting rather than writing an empty one, so "no draft" has exactly
     * one representation. */
    it('discards it by deleting the document', async () => {
      jest.spyOn(FirebaseFirestore, 'deleteDocument').mockResolvedValue();

      await service.discardDraft(RESTAURANT_ID, ROOM_ID);

      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
        reference: DRAFT_REFERENCE,
      });
    });
  });

  describe('the table documents', () => {
    it('creates a table and returns it with the id Firestore assigned', async () => {
      jest
        .spyOn(FirebaseFirestore, 'addDocument')
        .mockResolvedValue({ reference: { id: 'table-99' } } as FirestoreAdd);

      const { id, ...rest } = ROUND_TABLE;
      const created = await service.createTable(RESTAURANT_ID, rest);

      expect(created.id).toBe('table-99');
      expect(FirebaseFirestore.addDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/tables`,
        data: expect.objectContaining({ shape: 'round', diameter: 900 }),
      });
      expect(id).toBe(ROUND_TABLE.id);
    });

    it('deletes a table by its own reference', async () => {
      jest.spyOn(FirebaseFirestore, 'deleteDocument').mockResolvedValue();

      await service.deleteTable(RESTAURANT_ID, ROUND_TABLE.id);

      expect(FirebaseFirestore.deleteDocument).toHaveBeenCalledWith({
        reference: `restaurants/${RESTAURANT_ID}/tables/${ROUND_TABLE.id}`,
      });
    });
  });

  /**
   * The callable the publish step of issue #1088 and the sheet page of issue
   * #1087 both make. It is a callable rather than a write from here because
   * `qrTokenId` is backend-owned (issue #1086).
   */
  describe('issueTableQrTokens', () => {
    it('asks the backend for the codes of one restaurant', async () => {
      const result = {
        restaurantId: RESTAURANT_ID,
        tokens: [
          {
            tableId: ROUND_TABLE.id,
            label: '12',
            token: 'ABC',
            status: 'existing' as const,
          },
        ],
        skippedTableIds: [],
      };

      jest.mocked(FirebaseFunctions.callByName).mockResolvedValue({
        data: result,
      } as never);

      await expect(service.issueTableQrTokens(RESTAURANT_ID)).resolves.toEqual(
        result,
      );
      expect(FirebaseFunctions.callByName).toHaveBeenCalledWith({
        name: 'issueTableQrTokens',
        data: { restaurantId: RESTAURANT_ID },
      });
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
