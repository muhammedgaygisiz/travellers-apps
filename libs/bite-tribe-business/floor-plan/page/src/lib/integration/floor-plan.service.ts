import {
  computed,
  inject,
  Injectable,
  linkedSignal,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  FloorPlanConflictError,
  FloorPlanDataAccessService,
  RoomNotEmptyError,
} from 'bite-tribe-business/floor-plan-data-access';
import {
  DEFAULT_GRID_SPACING,
  DUPLICATE_OFFSET,
  FloorPlanCanvasCommand,
  FloorPlanItem,
  FloorPlanPlacement,
  MAX_ITEM_SIDE,
  MIN_ITEM_SIDE,
  clampCentre,
  itemFromObject,
  itemFromTable,
  normaliseRotation,
  paletteEntry,
  snapToGrid,
} from 'bite-tribe-business/floor-plan-ui';
import {
  FloorPlanPoint,
  FloorPlanSize,
  Millimetres,
  Restaurant,
  RestaurantTable,
  Room,
} from 'model';
import { ToastService } from 'toast';
import { resourceFailed, resourceValue } from 'utils';
import {
  HistoryState,
  canRedo,
  canUndo,
  historyOf,
  record,
  redo,
  undo,
} from './floor-plan-history';
import {
  FloorPlanLayout,
  duplicateIds,
  layoutChanged,
  layoutIds,
  layoutOf,
  placeEntry,
  tableWrites,
  withItemGeometry,
  withoutIds,
} from './floor-plan-layout';
import { RoomDraft } from './room-draft';

export const RESTAURANT_COLLECTION = 'restaurants';

/**
 * The workflow half of the floor-plan editor (GitHub issue #1082).
 *
 * ## Which restaurant
 *
 * The route parameter, not the loaded restaurant — the same reason the staff
 * and menu surfaces read it that way. `restaurant$` is a derived selector that
 * is `undefined` whenever there is no GPS position, which is an ordinary state
 * for anyone who declined the location permission, and this page is reachable
 * by direct URL. The route always carries `:restaurantId`, and it is the id
 * `ownedRestaurantGuard` and the Firestore rules both authorise against.
 *
 * ## Why the resource is here
 *
 * `FloorPlanDataAccessService` deliberately exposes plain promises rather than
 * Angular resources: which room is open is editor state, and issue #1081 left
 * the loading state to the page that did not exist yet. This is that page, so
 * the resource is keyed on the restaurant here and the room selection is a
 * signal beside it.
 *
 * ## What a rejected save means
 *
 * Two devices editing one plan is the ordinary case: an owner rearranges on a
 * tablet in the room while the laptop in the office still shows the plan from
 * ten minutes ago. The rules refuse the second save, and
 * `FloorPlanConflictError` carries the room *as stored* — so the answer is to
 * put that room on screen and let the owner decide, never to report a failure
 * they cannot act on. That is also why the stored room is taken off the error
 * instead of re-read: the read already happened when the refusal was explained.
 */
@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  private readonly dataAccess = inject(FloorPlanDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly toast = inject(ToastService);

  readonly restaurantId = this.storeService.restaurantIdFromUrl;

  readonly roomsLoader: ResourceLoader<
    Room[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    return restaurantId ? this.dataAccess.loadRooms(restaurantId) : [];
  };

  readonly rooms = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.roomsLoader.bind(this),
  });

  /**
   * The restaurant the plan belongs to, read for its name alone.
   *
   * A page headed "Floor plan" showing a room called "Terrace" does not say
   * which restaurant's terrace it is, and the owner reached it from a list where
   * every entry looks the same. Read here for the reason on `restaurantId`
   * above rather than taken from the store.
   */
  readonly restaurantLoader: ResourceLoader<
    Restaurant | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    if (!restaurantId) {
      return undefined;
    }

    const { snapshot } = await FirebaseFirestore.getDocument({
      reference: `${RESTAURANT_COLLECTION}/${restaurantId}`,
    });

    return snapshot?.data
      ? ({ ...snapshot.data, id: snapshot.id } as Restaurant)
      : undefined;
  };

  readonly restaurant = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.restaurantLoader.bind(this),
  });

  // Guarded reads: `value()` throws once a read has failed (issue #1232).
  readonly roomsValue = resourceValue(this.rooms, [] as Room[]);
  readonly restaurantValue = resourceValue(this.restaurant);
  readonly loading = computed(() => this.rooms.isLoading());

  /**
   * True once the room read has failed.
   *
   * Kept apart from the value so the page has a terminal state: a failed read
   * resolves to an empty list through `resourceValue`, and a page that took
   * that at face value would tell the owner their restaurant has no rooms.
   */
  readonly loadFailed = resourceFailed(this.rooms);

  readonly restaurantName = computed(() => this.restaurantValue()?.name ?? '');

  private readonly pending = signal(false);
  readonly saving = this.pending.asReadonly();

  /**
   * Which room the owner picked, or nothing while they have picked none.
   *
   * Kept separately from the resolved room so a reload does not lose the
   * selection, and so the first room of a freshly loaded restaurant is open
   * without anybody having chosen it.
   */
  private readonly requestedRoomId = signal<string | undefined>(undefined);

  readonly selectedRoom = computed<Room | undefined>(() => {
    const rooms = this.roomsValue();
    const requested = this.requestedRoomId();

    return rooms.find((room) => room.id === requested) ?? rooms[0];
  });

  /**
   * The tables standing in the open room.
   *
   * Keyed on the room rather than on the restaurant, because that is the query
   * `loadTables` runs and because the editor draws one room at a time. Reading
   * every table of a restaurant to draw one terrace would grow with the whole
   * business instead of with the room on screen.
   */
  readonly tablesLoader: ResourceLoader<
    RestaurantTable[] | undefined,
    { restaurantId: string | undefined; roomId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId, roomId } = params;

    return restaurantId && roomId
      ? this.dataAccess.loadTables(restaurantId, roomId)
      : [];
  };

  readonly tables = resource({
    params: () => ({
      restaurantId: this.restaurantId(),
      roomId: this.selectedRoom()?.id,
    }),
    loader: this.tablesLoader.bind(this),
  });

  readonly tablesValue = resourceValue(this.tables, [] as RestaurantTable[]);

  /**
   * The room and its tables exactly as they are stored, and what makes them a
   * different plan.
   *
   * Three things reseed the editor, and nothing else does: a different room, a
   * new version of the same room, and a fresh read of its tables. Deliberately
   * *not* the room object's identity — the rooms array is rebuilt whenever
   * anything in it changes, and reseeding on that would throw away the owner's
   * undo stack while they were still arranging. Saving moves the version, which
   * is exactly the case where the stored plan genuinely became something else.
   *
   * The tables are compared by array identity because that is what a resource
   * gives: one array while it holds a value, a new one when a read completes.
   */
  private readonly storedPlan = computed<{
    roomId: string;
    version: number;
    tables: readonly RestaurantTable[];
    layout: FloorPlanLayout;
  }>(
    () => {
      const room = this.selectedRoom();
      const tables = this.tablesValue();

      return {
        roomId: room?.id ?? '',
        version: room?.version ?? 0,
        tables,
        layout: layoutOf(room, tables),
      };
    },
    {
      equal: (before, after) =>
        before.roomId === after.roomId &&
        before.version === after.version &&
        before.tables === after.tables,
    },
  );

  /**
   * The layout being edited, with everything the owner can undo.
   *
   * A `linkedSignal` so a different room, or the same room at a new version,
   * starts a fresh history — and so nothing else does. The computation reads
   * only its source, because a `linkedSignal` tracks every signal it reads and
   * reaching past the source would reseed the history on any unrelated change,
   * throwing the owner's undo stack away mid-edit.
   */
  private readonly history = linkedSignal<
    { layout: FloorPlanLayout },
    HistoryState<FloorPlanLayout>
  >({
    source: this.storedPlan,
    computation: (stored) => historyOf(stored.layout),
  });

  readonly layout = computed(() => this.history().present);

  /** The layout flattened into what the canvas draws: geometry first, tables above it. */
  readonly items = computed<FloorPlanItem[]>(() => {
    const layout = this.layout();

    return [
      ...layout.objects.map(itemFromObject),
      ...layout.tables.map(itemFromTable),
    ];
  });

  /**
   * Which items are selected.
   *
   * Not in the history: selecting something changes nothing an owner could
   * lose, and an undo stack that recorded it would spend its entries undoing
   * clicks. Pruned on undo and redo instead, because an item the history just
   * removed cannot stay selected.
   */
  private readonly selection = signal<readonly string[]>([]);
  readonly selectedIds = this.selection.asReadonly();

  readonly selectedItems = computed(() => {
    const chosen = new Set(this.selection());

    return this.items().filter((item) => chosen.has(item.id));
  });

  readonly canUndo = computed(() => canUndo(this.history()));
  readonly canRedo = computed(() => canRedo(this.history()));

  /** Whether the plan on screen differs from the plan in Firestore. */
  readonly unsavedChanges = computed(() =>
    layoutChanged(this.storedPlan().layout, this.layout()),
  );

  readonly gridSpacing = signal<Millimetres>(DEFAULT_GRID_SPACING);

  /**
   * Whether the next edit lands on a grid line.
   *
   * Viewport-adjacent editor state, stored nowhere. Turning it on changes where
   * the *next* value goes and never walks through a plan an owner already
   * arranged, which is why nothing here snaps on load.
   */
  readonly snapEnabled = signal(true);

  /** The spacing an edit lands on, or `0` while snapping is off. */
  readonly snapSpacing = computed(() =>
    this.snapEnabled() ? this.gridSpacing() : 0,
  );

  readonly isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  selectRoom(roomId: string): void {
    this.requestedRoomId.set(roomId);
  }

  setGridSpacing(spacing: Millimetres): void {
    this.gridSpacing.set(spacing);
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled.set(enabled);
  }

  // -------------------------------------------------------- editing the plan

  select(ids: readonly string[]): void {
    this.selection.set([...ids]);
  }

  /**
   * A palette entry placed at a point on the plan.
   *
   * The new item is selected, because placing something and then having to find
   * it again to size it is two steps where the owner meant one — and because it
   * is what makes place, nudge, duplicate work as a sequence.
   */
  place(placement: FloorPlanPlacement): void {
    const room = this.selectedRoom();
    const entry = paletteEntry(placement.variant);

    if (!room || !entry) {
      return;
    }

    const { layout, id } = placeEntry(
      this.layout(),
      entry,
      clampCentre(
        {
          x: snapToGrid(placement.position.x, this.snapSpacing()),
          y: snapToGrid(placement.position.y, this.snapSpacing()),
        },
        room.size,
      ),
      room.id,
    );

    this.mutate(layout);
    this.selection.set([id]);
  }

  /** The geometry a canvas gesture, a nudge or a properties input produced. */
  applyItems(items: readonly FloorPlanItem[]): void {
    if (items.length > 0) {
      this.mutate(withItemGeometry(this.layout(), items));
    }
  }

  /**
   * Resizes and rotates the one selected item from the properties inputs.
   *
   * The same path as a handle drag, so a plan built entirely from the keyboard
   * and one built entirely from the pointer end up as the same document. The
   * side is bounded and the rotation normalised here rather than trusted from
   * an `<input>`: the model's `0` to `359` is a contract the type cannot carry.
   */
  resizeSelected(size: FloorPlanSize): void {
    const item = this.singleSelection();

    if (!item) {
      return;
    }

    const side = (value: Millimetres): Millimetres =>
      Math.min(MAX_ITEM_SIDE, Math.max(MIN_ITEM_SIDE, Math.round(value)));
    const width = side(size.width);

    this.applyItems([
      {
        ...item,
        size: {
          width,
          height: item.round ? width : side(size.height),
        },
      },
    ]);
  }

  rotateSelected(degrees: number): void {
    const item = this.singleSelection();

    if (item) {
      this.applyItems([{ ...item, rotation: normaliseRotation(degrees) }]);
    }
  }

  duplicateSelection(): void {
    const room = this.selectedRoom();
    const ids = this.selection();

    if (!room || ids.length === 0) {
      return;
    }

    // One grid cell across and down, so the copy is visibly beside its original
    // and still on the grid the original was placed on.
    const step = this.snapSpacing() > 0 ? this.snapSpacing() : DUPLICATE_OFFSET;
    const offset: FloorPlanPoint = { x: step, y: step };
    const duplicated = duplicateIds(this.layout(), ids, offset, room.size);

    this.mutate(duplicated.layout);
    this.selection.set(duplicated.ids);
  }

  deleteSelection(): void {
    const ids = this.selection();

    if (ids.length === 0) {
      return;
    }

    this.mutate(withoutIds(this.layout(), ids));
    this.selection.set([]);
  }

  selectAll(): void {
    this.selection.set(layoutIds(this.layout()));
  }

  undo(): void {
    this.history.update(undo);
    this.pruneSelection();
  }

  redo(): void {
    this.history.update(redo);
    this.pruneSelection();
  }

  /** The keyboard shortcuts the canvas cannot answer for itself. */
  runCommand(command: FloorPlanCanvasCommand): void {
    ({
      delete: (): void => this.deleteSelection(),
      duplicate: (): void => this.duplicateSelection(),
      undo: (): void => this.undo(),
      redo: (): void => this.redo(),
      'select-all': (): void => this.selectAll(),
    })[command]();
  }

  /**
   * The one item the properties inputs edit, or nothing.
   *
   * Exactly one, matching the panel: with two tables selected there is no
   * single width to type into a field, and silently resizing whichever came
   * first is worse than doing nothing.
   */
  private singleSelection(): FloorPlanItem | undefined {
    const selected = this.selectedItems();

    return selected.length === 1 ? selected[0] : undefined;
  }

  private mutate(next: FloorPlanLayout): void {
    this.history.update((state) => record(state, next));
  }

  /**
   * Drops from the selection whatever the history just took away.
   *
   * Undoing a placement leaves the object selected and gone, and the properties
   * panel would then be editing a table that is not in the plan.
   */
  private pruneSelection(): void {
    const present = new Set(layoutIds(this.layout()));

    this.selection.update((ids) => ids.filter((id) => present.has(id)));
  }

  async createRoom(draft: RoomDraft): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return;
    }

    this.pending.set(true);

    try {
      const created = await this.dataAccess.createRoom(restaurantId, {
        name: draft.name,
        order: this.nextOrder(),
        size: this.sizeOf(draft),
        objects: [],
      });

      this.rooms.set([...this.roomsValue(), created]);
      this.requestedRoomId.set(created.id);

      await this.toast.present({
        messageKey: 'floor-plan-room-created',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to create the room:', error);
      await this.toast.present({
        messageKey: 'floor-plan-room-save-failed',
        outcome: 'failure',
      });
    } finally {
      this.pending.set(false);
    }
  }

  /**
   * Writes the open room: its name, its dimensions and everything standing in
   * it.
   *
   * One action rather than a save per surface, because the owner sees one plan.
   * The version comes from the room as loaded, so the save still carries the
   * version it was read at and nothing the form could have invented.
   *
   * ## Two writes, in this order
   *
   * The room document first, because it is the one the version rule guards: a
   * save that lost a race has to be refused before any table is written, or a
   * conflict would leave tables from a plan the owner is about to be shown a
   * different version of. Tables follow, one write per table that actually
   * changed and one delete per table the owner removed — `saveRoom` sends only
   * the room document, so rearranging the furniture around a table never
   * rewrites it (issue #1081).
   */
  async saveRoom(draft: RoomDraft): Promise<void> {
    const restaurantId = this.restaurantId();
    const room = this.selectedRoom();

    if (!restaurantId || !room) {
      return;
    }

    this.pending.set(true);

    const layout = this.layout();

    try {
      const saved = await this.dataAccess.saveRoom(restaurantId, {
        ...room,
        name: draft.name,
        size: this.sizeOf(draft),
        objects: layout.objects,
      });

      await this.writeTables(restaurantId, layout.tables);

      this.tables.set(layout.tables);
      this.replaceRoom(saved);

      await this.toast.present({
        messageKey: 'floor-plan-room-saved',
        outcome: 'success',
      });
    } catch (error) {
      await this.reportSaveFailure(error);
    } finally {
      this.pending.set(false);
    }
  }

  /**
   * The table documents one save touches, and no others.
   *
   * Written in parallel because they are independent documents with no version
   * to order them by, and worked out by comparing values rather than by
   * tracking edits, so a table dragged out and dragged back costs nothing.
   */
  private async writeTables(
    restaurantId: string,
    tables: readonly RestaurantTable[],
  ): Promise<void> {
    const { changed, deleted } = tableWrites(this.tablesValue(), tables);

    await Promise.all([
      ...changed.map((table) => this.dataAccess.saveTable(restaurantId, table)),
      ...deleted.map((id) => this.dataAccess.deleteTable(restaurantId, id)),
    ]);
  }

  async deleteRoom(room: Room): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return;
    }

    this.pending.set(true);

    try {
      await this.dataAccess.deleteRoom(restaurantId, room.id);

      this.rooms.set(
        this.roomsValue().filter((candidate) => candidate.id !== room.id),
      );
      this.requestedRoomId.set(undefined);

      await this.toast.present({
        messageKey: 'floor-plan-room-deleted',
        outcome: 'success',
      });
    } catch (error) {
      // A room holding tables is a refusal with a number in it, not a failure:
      // the owner is told how many are in the way so they know what to move.
      if (error instanceof RoomNotEmptyError) {
        await this.toast.present({
          messageKey: 'floor-plan-room-not-empty',
          params: { count: error.tableCount },
          outcome: 'failure',
        });

        return;
      }

      console.error('Failed to delete the room:', error);
      await this.toast.present({
        messageKey: 'floor-plan-room-delete-failed',
        outcome: 'failure',
      });
    } finally {
      this.pending.set(false);
    }
  }

  logout(): void {
    this.storeService.logout();
  }

  /** The next display order, so a new room lands after the existing ones. */
  private nextOrder(): number {
    return this.roomsValue().reduce(
      (highest, room) => Math.max(highest, room.order + 1),
      0,
    );
  }

  /**
   * The draft's sides, snapped when the grid is on.
   *
   * This is the one place snapping applies in this issue, because a room's own
   * dimensions are the only coordinates an owner can enter yet. Object and
   * table placement uses the same `snapToGrid` from issue #1083 onward.
   */
  private sizeOf(draft: RoomDraft): FloorPlanSize {
    const spacing = this.snapEnabled() ? this.gridSpacing() : 0;

    return {
      width: snapToGrid(draft.width, spacing),
      height: snapToGrid(draft.height, spacing),
    };
  }

  private replaceRoom(room: Room): void {
    this.rooms.set(
      this.roomsValue().map((candidate) =>
        candidate.id === room.id ? room : candidate,
      ),
    );
  }

  private async reportSaveFailure(error: unknown): Promise<void> {
    if (error instanceof FloorPlanConflictError) {
      if (error.currentRoom) {
        this.replaceRoom(error.currentRoom);

        await this.toast.present({
          messageKey: 'floor-plan-room-conflict',
          outcome: 'failure',
        });
      } else {
        // Deleted from under us. There is no stored room to show, so the list
        // is the thing that has to be right.
        this.rooms.reload();

        await this.toast.present({
          messageKey: 'floor-plan-room-gone',
          outcome: 'failure',
        });
      }

      return;
    }

    console.error('Failed to save the room:', error);
    await this.toast.present({
      messageKey: 'floor-plan-room-save-failed',
      outcome: 'failure',
    });
  }
}
