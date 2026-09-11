import { Injectable } from '@angular/core';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { FirebaseFunctions } from '@capacitor-firebase/functions';
import { FloorPlanDraft, RestaurantTable, Room } from 'model';
import {
  FloorPlanConflictError,
  FloorPlanDraftConflictError,
  RoomNotEmptyError,
} from './floor-plan-errors';

export const RESTAURANT_COLLECTION = 'restaurants';
export const ROOMS_COLLECTION = 'rooms';
export const TABLES_COLLECTION = 'tables';

/**
 * Where a room's unpublished arrangement lives (GitHub issue #1088).
 *
 * ```text
 * /restaurants/{restaurantId}/rooms/{roomId}/drafts/current
 * ```
 *
 * A subcollection of the room rather than a field on it, so the rules can
 * admit staff to the published room document without handing them the draft.
 * One document with a fixed name rather than a collection of them, because a
 * room has one arrangement in progress: a second draft would be a second
 * answer to "what does this room look like", and nothing in the product asks
 * that question.
 */
export const DRAFTS_COLLECTION = 'drafts';
export const DRAFT_DOCUMENT = 'current';

/** The field a table names its room with. */
export const TABLE_ROOM_FIELD = 'roomId';

/**
 * The field a table carries its public number in (GitHub issue #1084).
 *
 * Queried rather than only read, because "table 12" is how staff and guests
 * name a table and the label is what a support request, a printed sheet and a
 * scan resolution all start from. [[Table]] makes it unique within the
 * restaurant, so a query on it answers with one table.
 */
export const TABLE_LABEL_FIELD = 'label';

/**
 * The version a room is created at.
 *
 * One rather than zero, so "version 1" in a conflict message means the first
 * saved state rather than the absence of one, and so a document that somehow
 * carries no `version` at all cannot pass the create rule by default.
 */
export const FIRST_ROOM_VERSION = 1;

/**
 * The revision a draft is created at.
 *
 * One rather than zero for the same reason as {@link FIRST_ROOM_VERSION}, and
 * because the rules read an absent revision as zero: a draft written without
 * one therefore fails the successor check rather than passing it by default.
 */
export const FIRST_DRAFT_REVISION = 1;

/**
 * `Omit` that survives a discriminated union.
 *
 * `Omit<RestaurantTable, 'id'>` would not: `keyof` a union is the keys the
 * members share, so it would drop `size` and `diameter` and flatten the shape
 * distinction the model exists to keep. Distributing over the union omits the
 * id from each member instead.
 */
type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never;

/** A room that has not been stored yet: no id from Firestore, no version. */
export type NewRoom = Omit<Room, 'id' | 'version'>;

/** A table that has not been stored yet, still round or still rectangular. */
export type NewTable = WithoutId<RestaurantTable>;

/** One room and the tables standing in it, as one plan load. */
export interface RoomPlan {
  room: Room;
  tables: RestaurantTable[];
  /** The unpublished arrangement, when the owner left one (issue #1088). */
  draft?: FloorPlanDraft;
}

/**
 * One table's QR token, as `issueTableQrTokens` reports it (issue \#1086).
 *
 * `existing` is the idempotent repeat and the reason the sheet page may ask on
 * every visit: the table already held an active token, nothing was written,
 * and the codes already printed and stuck to tables stay valid.
 */
export interface TableQrTokenResult {
  tableId: string;
  label: string;
  token: string;
  status: 'issued' | 'existing' | 'rotated';
}

export interface IssueTableQrTokensResult {
  restaurantId: string;
  tokens: TableQrTokenResult[];
  /** Tables that were asked for and are not in service, so got no token. */
  skippedTableIds: string[];
}

/**
 * A room as it is stored: every field of `Room` except its id.
 *
 * Written field by field rather than by spreading the object, so the editor
 * cannot push a transient field - a selection, a drag offset, a dirty flag -
 * into Firestore by holding it on the same object.
 */
const toRoomDocument = (room: Omit<Room, 'id'>): Omit<Room, 'id'> => ({
  name: room.name,
  order: room.order,
  size: room.size,
  objects: room.objects,
  version: room.version,
  // Absent rather than `undefined`, and absent is what clears it: a room save
  // replaces the document, so a floor the owner emptied stops being stored
  // instead of being stored as an empty name (issue #1085).
  ...(room.floor === undefined ? {} : { floor: room.floor }),
});

/** The fields a table carries whatever shape it is drawn as. */
const tableFieldsEveryShapeHas = (
  table: NewTable,
): Omit<NewTable, 'shape' | 'size' | 'diameter'> => ({
  label: table.label,
  roomId: table.roomId,
  position: table.position,
  rotation: table.rotation,
  seats: table.seats,
  enabled: table.enabled,
  // Absent rather than `undefined`: Firestore stores a null where the model
  // means "no token issued yet" (issue #1086 issues them).
  ...(table.qrTokenId === undefined ? {} : { qrTokenId: table.qrTokenId }),
});

/**
 * A table as it is stored.
 *
 * The shape branch is the point: `RestaurantTable` is a union discriminated on
 * `shape`, and writing the branch out here is what keeps a round table from
 * carrying a stale `size` and a rectangular one from carrying a `diameter`
 * once an owner switches the shape in the editor.
 */
const toTableDocument = (table: NewTable): NewTable =>
  table.shape === 'round'
    ? {
        ...tableFieldsEveryShapeHas(table),
        shape: 'round',
        diameter: table.diameter,
      }
    : {
        ...tableFieldsEveryShapeHas(table),
        shape: 'rectangle',
        size: table.size,
      };

/**
 * A draft as it is stored (GitHub issue #1088).
 *
 * Field by field for the reason {@link toRoomDocument} gives, and with the
 * tables put through {@link toTableDocument} as well: a draft holds whole
 * tables, so an editor field riding on a table object would reach Firestore
 * through the draft even though the table document itself is protected.
 */
const toDraftDocument = (
  draft: Omit<FloorPlanDraft, 'revision' | 'updatedAt'>,
): Omit<FloorPlanDraft, 'revision' | 'updatedAt'> => ({
  name: draft.name,
  size: draft.size,
  objects: draft.objects,
  tables: draft.tables.map(
    (table) => ({ ...toTableDocument(table), id: table.id }) as RestaurantTable,
  ),
  ...(draft.floor === undefined ? {} : { floor: draft.floor }),
});

/**
 * Loading and saving one restaurant's floor plan (GitHub issue #1081).
 *
 * ## What it stores where
 *
 * ```text
 * /restaurants/{restaurantId}/rooms/{roomId}                 published room
 * /restaurants/{restaurantId}/rooms/{roomId}/drafts/current  work in progress
 * /restaurants/{restaurantId}/tables/{tableId}               one per table
 * ```
 *
 * The room document and the table documents are the *published* plan, which is
 * what staff and a scanned QR code read. The draft is what the owner is
 * arranging right now, and it is a document of its own so that a reader of the
 * published plan cannot see it (issue #1088).
 *
 * Geometry lives inline in its room because a plan is edited and saved as a
 * whole room, so `loadRoomPlan` costs one document read plus one query however
 * many walls and chairs are drawn. Tables are separate documents because they
 * are business entities with their own lifetime: live state, visits and orders
 * point at a table, and rearranging the furniture around one must not rewrite
 * it. That is also why `saveRoom` sends only the room document - a geometry
 * edit touches no table at all.
 *
 * ## Concurrency
 *
 * Two devices editing one plan is the ordinary case, not the edge case: an
 * owner rearranges on a tablet in the room while the laptop in the office
 * still shows the plan as it was ten minutes ago. So a room save carries
 * `version + 1` of the version it was read at, and `firestore.rules` accepts
 * the write only when that is exactly the successor of the stored version. The
 * loser of the race gets a {@link FloorPlanConflictError} carrying the stored
 * room, instead of quietly overwriting the winner.
 *
 * Enforcement is in the rules rather than here, because a check in this
 * service protects only the callers that go through this service. Tables carry
 * no version: a table is written by one deliberate action on one small
 * document, and the edit that a second device can silently lose is the room
 * geometry both devices hold a whole copy of.
 *
 * The draft counts separately, in `revision`. It is written every few seconds
 * by an autosave, so sharing the room's `version` would make every autosave
 * read as a publish to anything watching it — including the editor, which
 * reseeds from a room whose version moved.
 *
 * ## Why no `resource()`
 *
 * The other data-access services in this workspace expose Angular resources
 * keyed on the route. A floor plan cannot be: which room is open is editor
 * state, and there is no editor yet - it arrives with issue #1082. These are
 * plain promises so that the page owns its own loading state when it exists.
 */
@Injectable({ providedIn: 'root' })
export class FloorPlanDataAccessService {
  private roomsReference(restaurantId: string): string {
    return `${RESTAURANT_COLLECTION}/${restaurantId}/${ROOMS_COLLECTION}`;
  }

  private roomReference(restaurantId: string, roomId: string): string {
    return `${this.roomsReference(restaurantId)}/${roomId}`;
  }

  private tablesReference(restaurantId: string): string {
    return `${RESTAURANT_COLLECTION}/${restaurantId}/${TABLES_COLLECTION}`;
  }

  private tableReference(restaurantId: string, tableId: string): string {
    return `${this.tablesReference(restaurantId)}/${tableId}`;
  }

  private draftReference(restaurantId: string, roomId: string): string {
    return `${this.roomReference(restaurantId, roomId)}/${DRAFTS_COLLECTION}/${DRAFT_DOCUMENT}`;
  }

  /**
   * Every room of one restaurant, in the display order the owner chose.
   *
   * Sorted here rather than by Firestore, because the result is the handful of
   * rooms one restaurant has and an `orderBy` would cost an index for nothing.
   */
  async loadRooms(restaurantId: string): Promise<Room[]> {
    const result = await FirebaseFirestore.getCollection({
      reference: this.roomsReference(restaurantId),
    });

    return (result?.snapshots ?? [])
      .map((snapshot) => ({ ...snapshot.data, id: snapshot.id }) as Room)
      .sort((a, b) => a.order - b.order);
  }

  /** One room, or `undefined` when it does not exist. */
  async loadRoom(
    restaurantId: string,
    roomId: string,
  ): Promise<Room | undefined> {
    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: this.roomReference(restaurantId, roomId),
    });

    return snapshot?.data
      ? ({ ...snapshot.data, id: snapshot.id } as Room)
      : undefined;
  }

  /** The tables of one restaurant, or of one room when `roomId` is given. */
  async loadTables(
    restaurantId: string,
    roomId?: string,
  ): Promise<RestaurantTable[]> {
    return this.queryTables(
      restaurantId,
      roomId === undefined
        ? undefined
        : { field: TABLE_ROOM_FIELD, value: roomId },
    );
  }

  /**
   * The one table carrying a label, or `undefined`.
   *
   * "Table 12" is the name a staff member says out loud, and [[Table]] makes it
   * unique within the restaurant, so this returns a single table rather than a
   * list. Uniqueness is held by the editor rather than by Firestore - security
   * rules cannot query, so no rule can ask whether a label is already taken -
   * and the first match is therefore the answer rather than a choice between
   * candidates.
   */
  async loadTableByLabel(
    restaurantId: string,
    label: string,
  ): Promise<RestaurantTable | undefined> {
    const [table] = await this.queryTables(restaurantId, {
      field: TABLE_LABEL_FIELD,
      value: label,
    });

    return table;
  }

  /**
   * The tables of one restaurant, optionally narrowed to one equal field.
   *
   * A `where` on the table rather than a table subcollection of the room,
   * because a table keeps its identity when it moves to another room: moving it
   * is one field change here, where a nested path would mean deleting and
   * recreating the document its QR token and its history point at.
   */
  private async queryTables(
    restaurantId: string,
    match?: { field: string; value: string },
  ): Promise<RestaurantTable[]> {
    const result = await FirebaseFirestore.getCollection({
      reference: this.tablesReference(restaurantId),
      ...(match
        ? {
            compositeFilter: {
              type: 'and' as const,
              queryConstraints: [
                {
                  type: 'where' as const,
                  fieldPath: match.field,
                  opStr: '==' as const,
                  value: match.value,
                },
              ],
            },
          }
        : {}),
    });

    return (result?.snapshots ?? []).map(
      (snapshot) =>
        ({ ...snapshot.data, id: snapshot.id }) as unknown as RestaurantTable,
    );
  }

  /**
   * One room and its tables: one document read plus one query, whatever the
   * plan contains.
   *
   * Returns `undefined` for a room that is not there, rather than an empty
   * plan, so a stale deep link is distinguishable from an empty room.
   */
  async loadRoomPlan(
    restaurantId: string,
    roomId: string,
  ): Promise<RoomPlan | undefined> {
    const [room, tables, draft] = await Promise.all([
      this.loadRoom(restaurantId, roomId),
      this.loadTables(restaurantId, roomId),
      this.loadDraft(restaurantId, roomId),
    ]);

    return room ? { room, tables, draft } : undefined;
  }

  /**
   * The room's unpublished arrangement, or `undefined` when there is none
   * (GitHub issue #1088).
   *
   * `undefined` is the ordinary answer, not a failure: a room nobody is
   * halfway through rearranging has no draft, and the editor then starts from
   * the published plan.
   */
  async loadDraft(
    restaurantId: string,
    roomId: string,
  ): Promise<FloorPlanDraft | undefined> {
    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: this.draftReference(restaurantId, roomId),
    });

    return snapshot?.data ? (snapshot.data as FloorPlanDraft) : undefined;
  }

  /**
   * Writes the draft, carrying the successor of the revision it was read at.
   *
   * `draft` is the arrangement as the editor holds it; the revision and the
   * timestamp are set here, so nothing upstream has to remember to move a
   * counter it does not own. Returns the draft as it now stands, so the caller
   * can keep editing and autosave again without re-reading.
   *
   * Throws {@link FloorPlanDraftConflictError} when a second device wrote the
   * draft first. Writing nothing is the right answer there: the editor keeps
   * what is on screen and tells the owner autosave has stopped, because the
   * arrangement in front of them is the only copy of itself.
   */
  async saveDraft(
    restaurantId: string,
    roomId: string,
    draft: Omit<FloorPlanDraft, 'revision' | 'updatedAt'>,
    baseRevision: number,
  ): Promise<FloorPlanDraft> {
    const next: FloorPlanDraft = {
      ...toDraftDocument(draft),
      revision: baseRevision + 1,
      updatedAt: Date.now(),
    };

    try {
      await FirebaseFirestore.setDocument({
        reference: this.draftReference(restaurantId, roomId),
        data: next,
      });
    } catch (error) {
      throw await this.explainRejectedDraft(
        restaurantId,
        roomId,
        baseRevision,
        error,
      );
    }

    return next;
  }

  /**
   * Why a draft write was rejected: a conflict, or something else.
   *
   * The same reasoning as {@link explainRejectedSave}. The rules refuse a
   * stale write and an unauthorised one identically, so the reason is worked
   * out from what is stored rather than parsed out of an error message whose
   * shape differs between the web and the native plugin.
   */
  private async explainRejectedDraft(
    restaurantId: string,
    roomId: string,
    baseRevision: number,
    error: unknown,
  ): Promise<unknown> {
    let stored: FloorPlanDraft | undefined;

    try {
      stored = await this.loadDraft(restaurantId, roomId);
    } catch {
      return error;
    }

    // An absent draft at revision 0 is the first write, not a conflict: the
    // owner started arranging a room nobody had a draft for.
    const storedRevision = stored?.revision ?? 0;

    return storedRevision === baseRevision
      ? error
      : new FloorPlanDraftConflictError(roomId, baseRevision, stored);
  }

  /**
   * Throws the draft away, leaving the published room as the only plan.
   *
   * Deleting the document rather than writing an empty one, so "no draft" has
   * one representation: the editor asks whether a draft exists and an empty
   * draft would answer yes. It is also what a publish does once the room has
   * been written, because the draft it was made from is now the room.
   */
  async discardDraft(restaurantId: string, roomId: string): Promise<void> {
    await FirebaseFirestore.deleteDocument({
      reference: this.draftReference(restaurantId, roomId),
    });
  }

  /** Creates a room at {@link FIRST_ROOM_VERSION} and returns it with its id. */
  async createRoom(restaurantId: string, room: NewRoom): Promise<Room> {
    const document = { ...room, version: FIRST_ROOM_VERSION };

    const { reference } = await FirebaseFirestore.addDocument({
      reference: this.roomsReference(restaurantId),
      data: toRoomDocument(document),
    });

    return { ...document, id: reference.id };
  }

  /**
   * Saves a room, carrying the version it was read at.
   *
   * Returns the room as it now stands, at the next version, so the caller can
   * keep editing without re-reading. Throws {@link FloorPlanConflictError}
   * when another device saved first.
   */
  async saveRoom(restaurantId: string, room: Room): Promise<Room> {
    const next: Room = { ...room, version: room.version + 1 };

    try {
      await FirebaseFirestore.setDocument({
        reference: this.roomReference(restaurantId, room.id),
        data: toRoomDocument(next),
      });
    } catch (error) {
      throw await this.explainRejectedSave(restaurantId, room, error);
    }

    return next;
  }

  /**
   * Why a room save was rejected: a conflict, or something else.
   *
   * The rules refuse a stale write and an unauthorised write the same way,
   * with a permission denial, and the plugin's error is a bare message on
   * native and a coded `FirebaseError` on the web - so the reason is worked
   * out from the stored data rather than parsed out of the error. If the room
   * has moved past the version the caller held, the save lost a race. If it
   * has not, the caller was refused for some other reason and the original
   * error is the honest thing to raise.
   *
   * A deleted room counts as a conflict too: the other device did something
   * else with it, and the answer is still to show the owner what happened
   * rather than to report a failure they cannot act on.
   */
  private async explainRejectedSave(
    restaurantId: string,
    room: Room,
    error: unknown,
  ): Promise<unknown> {
    let stored: Room | undefined;

    try {
      stored = await this.loadRoom(restaurantId, room.id);
    } catch {
      // The read failed too, so nothing can be said about the version. That is
      // the unauthorised case, and the write's own error describes it better.
      return error;
    }

    return stored === undefined || stored.version !== room.version
      ? new FloorPlanConflictError(room.id, room.version, stored)
      : error;
  }

  /**
   * Deletes a room, refusing while any table still names it.
   *
   * See {@link RoomNotEmptyError} for why the check is here and not in the
   * rules.
   */
  async deleteRoom(restaurantId: string, roomId: string): Promise<void> {
    const tables = await this.loadTables(restaurantId, roomId);

    if (tables.length > 0) {
      throw new RoomNotEmptyError(roomId, tables.length);
    }

    await FirebaseFirestore.deleteDocument({
      reference: this.roomReference(restaurantId, roomId),
    });
  }

  /**
   * Writes one table, whole.
   *
   * A full write rather than a merge, so a shape change drops the fields the
   * other shape used; {@link toTableDocument} decides which those are.
   */
  async saveTable(
    restaurantId: string,
    table: RestaurantTable,
  ): Promise<RestaurantTable> {
    await FirebaseFirestore.setDocument({
      reference: this.tableReference(restaurantId, table.id),
      data: toTableDocument(table),
    });

    return table;
  }

  /** Creates a table and returns it with the id Firestore assigned. */
  async createTable(
    restaurantId: string,
    table: NewTable,
  ): Promise<RestaurantTable> {
    const { reference } = await FirebaseFirestore.addDocument({
      reference: this.tablesReference(restaurantId),
      data: toTableDocument(table),
    });

    return { ...table, id: reference.id } as RestaurantTable;
  }

  async deleteTable(restaurantId: string, tableId: string): Promise<void> {
    await FirebaseFirestore.deleteDocument({
      reference: this.tableReference(restaurantId, tableId),
    });
  }

  /**
   * Asks the backend for the QR tokens of a restaurant's enabled tables.
   *
   * A callable rather than a write from here, and that is the shape of the
   * feature rather than a preference: issue \#1086 made `qrTokenId`
   * backend-owned in `firestore.rules`, and a token has to be minted from the
   * system CSPRNG and written in the same transaction as the table's pointer
   * at it. A client can do neither.
   *
   * Called every time the sheet page opens, which is safe because issuing is
   * idempotent — a table already holding an active token is reported as
   * `existing` and nothing is written. That is what lets the page ask without
   * a button, instead of making an owner press "generate" and wonder whether
   * pressing it twice invalidates the sheet they printed last week.
   *
   * Disabled tables come back in `skippedTableIds` rather than as a failure.
   * [[Table]] gives a code to every *enabled* table, and a plan that holds one
   * table out of service is an ordinary plan.
   */
  async issueTableQrTokens(
    restaurantId: string,
  ): Promise<IssueTableQrTokensResult> {
    const { data } = await FirebaseFunctions.callByName<
      { restaurantId: string },
      IssueTableQrTokensResult
    >({ name: 'issueTableQrTokens', data: { restaurantId } });

    return data;
  }
}
