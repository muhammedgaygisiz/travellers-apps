import {
  computed,
  effect,
  inject,
  Injectable,
  linkedSignal,
  resource,
  ResourceLoader,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { NavController } from '@ionic/angular/standalone';
import { BiteTribeStoreService } from 'bite-tribe/store';
import {
  FloorPlanConflictError,
  FloorPlanDataAccessService,
  FloorPlanDraftConflictError,
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
  FloorPlanDraft,
  FloorPlanPoint,
  FloorPlanSize,
  Millimetres,
  Restaurant,
  RestaurantTable,
  Room,
  TableShape,
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
  layoutOf,
  placeEntry,
  tableWrites,
  withItemGeometry,
  withoutIds,
} from './floor-plan-layout';
import {
  FloorPlanChangeSummary,
  NOTHING_CHANGED,
  RoomFields,
  changeSummary,
  formFields,
  openingFields,
  openingLayout,
  publishedFields,
  sameFields,
} from './floor-plan-publish';
import {
  EMPTY_VALIDATION,
  FloorPlanIssue,
  FloorPlanValidation,
  validateFloorPlan,
} from './floor-plan-validation';
import {
  RestaurantCapacity,
  RoomCapacity,
  capacityByRoom,
  reorderWrites,
  reorderedRooms,
  restaurantCapacity,
} from './floor-plan-rooms';
import {
  FIRST_TABLE_NUMBER,
  TableLabelConflict,
  labelConflict,
  numberedTables,
  withTableEnabled,
  withTableLabel,
  withTableRoom,
  withTableSeats,
  withTableShapeChanged,
} from './floor-plan-tables';
import { RoomDraft } from './room-draft';

export const RESTAURANT_COLLECTION = 'restaurants';

/**
 * How long the editor waits after the last edit before storing the draft
 * (GitHub issue #1088).
 *
 * Long enough that a drag, a nudge and a second nudge are one write rather
 * than three, and short enough that "closing the browser mid-edit returns to
 * the draft" is true in practice rather than in principle. A room switch and a
 * publish do not wait for it: both flush first, because the acceptable loss
 * here is the last second and a half, not the last arrangement.
 */
export const DRAFT_AUTOSAVE_DELAY_MS = 1_500;

/**
 * What the editor is currently doing about the draft.
 *
 * `blocked` is the one that is not a stage of the others: a second device is
 * writing the same draft, so this one has stopped rather than overwriting it.
 */
export type DraftStatus = 'idle' | 'saving' | 'saved' | 'failed' | 'blocked';

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
 *
 * ## Draft and published (GitHub issue #1088)
 *
 * Nothing the owner does here is live. Every edit goes into a draft that is
 * autosaved as they work, and publishing is the one deliberate action that
 * makes the draft the room — after validation that a plan with a blocking
 * error cannot get past.
 *
 * The two states have two different failure modes and therefore two different
 * answers. A refused *publish* shows the owner the room as stored, because the
 * published plan genuinely became something else and they have to see it
 * before overwriting it. A refused *draft write* reseeds nothing at all: the
 * arrangement on screen is the only copy of itself, and throwing it away is
 * exactly what autosave exists to prevent.
 */
@Injectable({ providedIn: 'root' })
export class FloorPlanService {
  private readonly dataAccess = inject(FloorPlanDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly navController = inject(NavController);
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
  readonly loading = computed(
    () => this.rooms.isLoading() || !this.draftLoaded(),
  );

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

  // ------------------------------------------------------------- the draft

  /**
   * The stored draft of one room, and which room it belongs to
   * (GitHub issue #1088).
   *
   * A signal loaded by hand rather than an Angular `resource`, because the
   * editor seeds itself from this and a resource cannot say *which* room its
   * current value is for. Between setting a new room and the resource's own
   * effect noticing, `isLoading()` is still false and `value()` is still the
   * previous room's draft — which is one frame long and would seed the terrace
   * with the dining room's unpublished arrangement. The room id is carried
   * beside the value here so that frame cannot happen.
   */
  private readonly loadedDraft = signal<
    { roomId: string; draft: FloorPlanDraft | undefined } | undefined
  >(undefined);

  /** The draft of the room that is actually open, or nothing. */
  readonly draftValue = computed<FloorPlanDraft | undefined>(() => {
    const roomId = this.selectedRoom()?.id;
    const loaded = this.loadedDraft();

    return loaded && roomId === loaded.roomId ? loaded.draft : undefined;
  });

  /** Whether the open room's draft has been read yet, one way or the other. */
  private readonly draftLoaded = computed(() => {
    const roomId = this.selectedRoom()?.id;

    return roomId === undefined || this.loadedDraft()?.roomId === roomId;
  });

  /**
   * The open room, once there is an answer about its draft.
   *
   * Everything that seeds the editor reads this rather than `selectedRoom`, so
   * a room is opened exactly once, on the plan the owner left rather than on
   * the published one it would otherwise flash through first.
   */
  readonly readyRoom = computed<Room | undefined>(() =>
    this.draftLoaded() ? this.selectedRoom() : undefined,
  );

  /**
   * Reads the draft of whichever room is open.
   *
   * A failed read is recorded as "no draft" rather than retried, because the
   * editor has to reach a terminal state: {@link draftLoaded} gates the whole
   * surface, and a read that neither succeeds nor gives up leaves an owner
   * looking at a spinner. The autosave status says the draft is not being
   * stored, so the owner is told rather than left to find out.
   */
  private readonly draftReader = effect(() => {
    const restaurantId = this.restaurantId();
    const roomId = this.selectedRoom()?.id;

    if (!restaurantId || !roomId) {
      return;
    }

    untracked(() => {
      if (this.loadedDraft()?.roomId === roomId) {
        return;
      }

      void this.readDraft(restaurantId, roomId);
    });
  });

  private async readDraft(restaurantId: string, roomId: string): Promise<void> {
    try {
      const draft = await this.dataAccess.loadDraft(restaurantId, roomId);

      this.acceptDraft(roomId, draft);
    } catch (error) {
      console.error('Failed to read the floor plan draft:', error);
      this.acceptDraft(roomId, undefined);
      this.draftStatus.set('failed');
    }
  }

  /** Records a read draft, unless the owner has already opened another room. */
  private acceptDraft(roomId: string, draft: FloorPlanDraft | undefined): void {
    if (this.selectedRoom()?.id === roomId) {
      this.loadedDraft.set({ roomId, draft });
    }
  }

  /**
   * Bumped whenever the editor has to start again from what is stored.
   *
   * Discarding a draft is the case that needs it: the room is the same room at
   * the same version and its tables did not move, so nothing else in
   * {@link storedPlan}'s identity changes, and without this the editor would go
   * on showing the arrangement the owner just threw away.
   */
  private readonly seedToken = signal(0);

  /** The same counter, for the room form, which reseeds on the same events. */
  readonly formSeed = this.seedToken.asReadonly();

  /**
   * Every table of the restaurant, not only the ones in the open room.
   *
   * Issue #1082 keyed this on the room, because the editor draws one room at a
   * time. Issue #1084 made a table's label unique across the *restaurant*,
   * including across rooms ([[Table]]), and a uniqueness rule cannot be checked
   * against data that is not loaded: the terrace's table 7 has to refuse the
   * dining room's second table 7 even though the terrace is not on screen.
   *
   * It is still one query per plan load rather than one per room, and it is
   * bounded by the tables of one restaurant rather than by the business. It
   * also means switching rooms re-reads nothing.
   */
  readonly tablesLoader: ResourceLoader<
    RestaurantTable[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    return restaurantId ? this.dataAccess.loadTables(restaurantId) : [];
  };

  readonly tables = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.tablesLoader.bind(this),
  });

  readonly tablesValue = resourceValue(this.tables, [] as RestaurantTable[]);

  /**
   * The stored tables of the open room, and of every other room.
   *
   * Compared element by element rather than by array identity, so a room list
   * rebuilt with the same contents does not hand `storedPlan` a new array and
   * throw away the owner's undo stack mid-edit.
   */
  private readonly sameTables = (
    before: readonly RestaurantTable[],
    after: readonly RestaurantTable[],
  ): boolean =>
    before.length === after.length &&
    before.every((table, index) => table === after[index]);

  readonly roomTables = computed<RestaurantTable[]>(
    () => {
      const roomId = this.selectedRoom()?.id;

      return roomId
        ? this.tablesValue().filter((table) => table.roomId === roomId)
        : [];
    },
    { equal: this.sameTables },
  );

  /**
   * The tables standing in the restaurant's other rooms.
   *
   * Their labels are what the editor has to avoid: a number taken on the
   * terrace is taken in the dining room too, and the owner never sees it while
   * they are editing this room.
   */
  readonly otherRoomTables = computed<RestaurantTable[]>(
    () => {
      const roomId = this.selectedRoom()?.id;

      return this.tablesValue().filter((table) => table.roomId !== roomId);
    },
    { equal: this.sameTables },
  );

  /** The labels a new or renumbered table in this room may not take. */
  private readonly reservedLabels = computed(() =>
    this.otherRoomTables().map((table) => table.label),
  );

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
   *
   * The seed layout is the *draft* when the room has one, because that is the
   * plan the owner was last working on (issue #1088). The draft's own revision
   * is deliberately not in the identity: an autosave writes it every few
   * seconds, and reseeding on it would hand the owner an editor whose undo
   * history emptied itself while they worked. What is in the identity instead
   * is {@link seedToken}, which the editor moves when it means it.
   */
  private readonly storedPlan = computed<{
    roomId: string;
    version: number;
    seed: number;
    tables: readonly RestaurantTable[];
    layout: FloorPlanLayout;
  }>(
    () => {
      const room = this.readyRoom();
      const tables = this.roomTables();
      const draft = this.draftValue();

      return {
        roomId: room?.id ?? '',
        version: room?.version ?? 0,
        seed: this.seedToken(),
        tables,
        layout: openingLayout(room, tables, draft),
      };
    },
    {
      equal: (before, after) =>
        before.roomId === after.roomId &&
        before.version === after.version &&
        before.seed === after.seed &&
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

  /**
   * The tables of the layout that still stand in the open room.
   *
   * Every table in the layout does, until the owner moves one to another room:
   * a move is an ordinary layout edit, so the table stays in the layout with
   * its new `roomId` until the save writes it, which is what keeps it undoable
   * and what stops the save mistaking it for a deleted table (issue #1085).
   * It is no longer part of *this* room, so it is not drawn, not selectable
   * and not counted here.
   */
  private readonly layoutRoomTables = computed<RestaurantTable[]>(() => {
    const roomId = this.selectedRoom()?.id;

    return this.layout().tables.filter((table) => table.roomId === roomId);
  });

  /** The layout flattened into what the canvas draws: geometry first, tables above it. */
  readonly items = computed<FloorPlanItem[]>(() => [
    ...this.layout().objects.map(itemFromObject),
    ...this.layoutRoomTables().map(itemFromTable),
  ]);

  /** Everything the owner can currently select, which is everything drawn. */
  private readonly visibleIds = computed<string[]>(() =>
    this.items().map((item) => item.id),
  );

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

  /**
   * The one table the table properties edit, or nothing.
   *
   * Exactly one, like the geometry inputs beside it: with two tables selected
   * there is no single number to type into a field, and renaming whichever came
   * first is worse than doing nothing. Read off the layout rather than off the
   * canvas items, because these fields are the table itself.
   */
  readonly selectedTable = computed<RestaurantTable | undefined>(() => {
    const ids = this.selection();

    return ids.length === 1
      ? this.layoutRoomTables().find((table) => table.id === ids[0])
      : undefined;
  });

  /** The tables in the current selection, for the bulk numbering helper. */
  readonly selectedTables = computed<RestaurantTable[]>(() => {
    const chosen = new Set(this.selection());

    return this.layoutRoomTables().filter((table) => chosen.has(table.id));
  });

  /**
   * The label the owner typed that was refused, until they type a usable one.
   *
   * Held here rather than derived, because it is the record of a rejected
   * *attempt*: the table still carries the label it had, so nothing in the
   * layout remembers what was refused, and a message that vanished on the next
   * render would leave the owner wondering why their typing did not stick.
   *
   * Not in the undo history. A refused edit changed nothing to undo.
   */
  private readonly rejectedLabel = signal<TableLabelConflict | undefined>(
    undefined,
  );

  readonly labelConflict = this.rejectedLabel.asReadonly();

  /** The room a conflicting label already lives in, for the message. */
  readonly labelConflictRoom = computed<string | undefined>(() => {
    const holder = this.rejectedLabel()?.holder;

    return holder
      ? this.roomsValue().find((room) => room.id === holder.roomId)?.name
      : undefined;
  });

  readonly canUndo = computed(() => canUndo(this.history()));
  readonly canRedo = computed(() => canRedo(this.history()));

  // ------------------------------------------- the room's own fields

  /**
   * The room form's values, while they differ from what is stored.
   *
   * The form lives in the component, and the draft has to carry the room's
   * name, its level and its dimensions as well as its contents - otherwise
   * resizing a room would be live while moving a table in it was not, and the
   * half of the plan that can put a table outside its room would be the half
   * that published itself. So the component reports its values here, and only
   * when they are usable: a width field mid-keystroke is not a room dimension,
   * and autosaving one would store a room half a metre wide.
   *
   * Reset whenever the editor reseeds, because the form does too.
   */
  private readonly roomFields = linkedSignal<string, RoomDraft | undefined>({
    source: () => {
      const stored = this.storedPlan();

      return `${stored.roomId}:${stored.version}:${stored.seed}`;
    },
    computation: () => undefined,
  });

  /** The room's fields as the owner currently has them. */
  private readonly currentFields = computed<RoomFields>(() => {
    const form = this.roomFields();

    if (form) {
      return formFields(form);
    }

    const room = this.readyRoom();

    return room
      ? openingFields(room, this.draftValue())
      : { name: '', size: { width: 0, height: 0 } };
  });

  /**
   * The open room at the dimensions the owner has given it.
   *
   * What the canvas draws and what every clamp measures against, because a
   * room the owner has just made smaller is smaller from that moment - the
   * published size is what the room *was*.
   */
  readonly editedRoom = computed<Room | undefined>(() => {
    const room = this.readyRoom();

    if (!room) {
      return undefined;
    }

    const fields = this.currentFields();

    return {
      ...room,
      name: fields.name,
      size: fields.size,
      ...(fields.floor === undefined
        ? { floor: undefined }
        : { floor: fields.floor }),
    };
  });

  /** The room's fields and contents exactly as they are published. */
  private readonly publishedState = computed(() => {
    const room = this.readyRoom();

    return room
      ? {
          fields: publishedFields(room),
          layout: layoutOf(room, this.roomTables()),
        }
      : undefined;
  });

  /** The room's fields and contents as the owner has them right now. */
  private readonly currentState = computed(() => ({
    fields: this.currentFields(),
    layout: this.layout(),
  }));

  /**
   * Whether the plan on screen differs from the plan that is published.
   *
   * Not "unsaved": since issue #1088 the arrangement *is* saved, continuously,
   * as a draft. What it is not is live. That is the state an owner needs to
   * see, because it is the one a publish resolves.
   */
  readonly unpublishedChanges = computed(() => {
    const published = this.publishedState();

    return published
      ? !sameFields(published.fields, this.currentFields()) ||
          layoutChanged(published.layout, this.layout())
      : false;
  });

  /** Whether a stored draft exists, which is what there is to discard. */
  readonly hasDraft = computed(() => this.draftValue() !== undefined);

  /** When the draft was last stored, or nothing while none has been. */
  readonly draftSavedAt = computed(() => this.draftValue()?.updatedAt);

  private readonly draftStatus = signal<DraftStatus>('idle');
  readonly autosaveStatus = this.draftStatus.asReadonly();

  /** What publishing would change, for the confirmation that precedes it. */
  readonly changeSummary = computed<FloorPlanChangeSummary>(() => {
    const published = this.publishedState();

    return published
      ? changeSummary(published, this.currentState())
      : NOTHING_CHANGED;
  });

  /**
   * Everything wrong with the plan, and whether it may be published.
   *
   * Measured against the room as the owner has it rather than as it is
   * published, so shrinking a room reports the tables that shrink left behind
   * before the smaller room is written rather than after.
   */
  readonly validation = computed<FloorPlanValidation>(() => {
    const room = this.editedRoom();

    return room
      ? validateFloorPlan({
          room,
          layout: this.layout(),
          otherTables: this.otherRoomTables(),
        })
      : EMPTY_VALIDATION;
  });

  /**
   * Whether the Publish button does anything.
   *
   * A blocking error closes it, which is the acceptance criterion: publishing
   * with one is impossible rather than discouraged. Nothing to publish closes
   * it too - except while a draft exists, because publishing an unchanged
   * draft is how an owner ends an edit they decided against making.
   */
  readonly canPublish = computed(
    () =>
      !this.pending() &&
      this.validation().publishable &&
      (this.changeSummary().changed || this.hasDraft()),
  );

  /**
   * Every table of the restaurant as the owner currently sees it
   * (GitHub issue #1085).
   *
   * The stored tables of the rooms nobody has open, plus the *edited* tables of
   * the one that is. A summary built on the stored tables alone would count a
   * table the owner placed a minute ago as belonging to no room and would leave
   * a table they just moved to the terrace on the dining-room total, which is
   * the one thing a capacity summary must not do while the plan is being
   * arranged.
   */
  private readonly currentTables = computed<RestaurantTable[]>(() =>
    this.selectedRoom()
      ? [...this.otherRoomTables(), ...this.layout().tables]
      : this.tablesValue(),
  );

  /**
   * Table count and seating, per room, keyed by room id.
   *
   * Answers the question an owner has while building a second room — "how many
   * people does the terrace actually seat" — without opening it, which is what
   * makes a plan of several rooms readable from the room list.
   */
  readonly roomCapacities = computed<Record<string, RoomCapacity>>(() =>
    capacityByRoom(this.roomsValue(), this.currentTables()),
  );

  /** The same numbers for the whole restaurant, across every room. */
  readonly restaurantCapacity = computed<RestaurantCapacity>(() =>
    restaurantCapacity(this.roomsValue(), this.currentTables()),
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

  /**
   * Opens another room, storing this one's draft before it goes.
   *
   * The flush is what makes the switch safe: opening a room reseeds the editor
   * from what is stored, so anything still inside the autosave's debounce
   * window would be lost. With it stored, there is nothing to warn about,
   * which is why this no longer asks (issue #1088).
   */
  async selectRoom(roomId: string): Promise<void> {
    if (roomId === this.selectedRoom()?.id) {
      return;
    }

    await this.flushDraft();
    this.requestedRoomId.set(roomId);
  }

  /**
   * The room form's values, as the component holds them.
   *
   * Sent on every usable change rather than on a save, because the draft
   * carries the room's own fields as well as its contents and the autosave has
   * to see them. The dimensions are snapped here for the reason
   * {@link sizeOf} gives, and the component sends nothing while a field is
   * mid-keystroke.
   */
  setRoomFields(fields: RoomDraft): void {
    const size = this.sizeOf(fields);

    this.roomFields.set({
      name: fields.name,
      width: size.width,
      height: size.height,
      floor: fields.floor,
    });
  }

  setGridSpacing(spacing: Millimetres): void {
    this.gridSpacing.set(spacing);
  }

  setSnapEnabled(enabled: boolean): void {
    this.snapEnabled.set(enabled);
  }

  // -------------------------------------------------------- editing the plan

  select(ids: readonly string[]): void {
    // A refused label belongs to the table that refused it, so selecting a
    // different one must not leave its message over somebody else's field.
    this.rejectedLabel.set(undefined);
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
    const room = this.editedRoom();
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
      this.reservedLabels(),
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

  // ------------------------------------------------- the table as an entity

  /**
   * Renames a table, or refuses and says why.
   *
   * The refusal is the point. [[Table]] makes a label unique within the
   * restaurant across all rooms, and a check that only warned would leave the
   * plan holding two tables called 12 until somebody tried to publish it — by
   * which time the owner has forgotten which one they meant. So a duplicate
   * label never reaches the layout: the table keeps the label it had, and the
   * conflict names the room that already holds the number.
   *
   * An empty label is refused for the same reason rather than as validation
   * politeness: a table with no number cannot be printed on a QR sheet, called
   * out by staff, or found by the label query.
   */
  renameTable(label: string): void {
    const table = this.selectedTable();

    if (!table) {
      return;
    }

    const conflict = labelConflict(label, table.id, [
      ...this.layout().tables,
      ...this.otherRoomTables(),
    ]);

    if (conflict) {
      this.rejectedLabel.set(conflict);

      return;
    }

    this.rejectedLabel.set(undefined);
    this.mutate(withTableLabel(this.layout(), table.id, label));
  }

  /** Seating capacity, bounded here rather than trusted from an `<input>`. */
  setTableSeats(seats: number): void {
    const table = this.selectedTable();

    if (table) {
      this.mutate(withTableSeats(this.layout(), table.id, seats));
    }
  }

  /**
   * Takes a table in or out of service.
   *
   * A configuration decision, not the operational "blocked right now" of a live
   * view: the table stays in the plan, keeps its number and is drawn
   * differently, because it is still a real place in the room.
   */
  setTableEnabled(enabled: boolean): void {
    const table = this.selectedTable();

    if (table) {
      this.mutate(withTableEnabled(this.layout(), table.id, enabled));
    }
  }

  /**
   * Moves the selected table to another room (GitHub issue #1085).
   *
   * An ordinary layout edit rather than an immediate write, so it is undoable
   * and lands with the same save as everything else the owner changed. The
   * table keeps its `id`, its `label` and its `qrTokenId`, so a printed QR code
   * stays valid — that is the whole reason `roomId` is a field on the table
   * rather than the table being a document under its room.
   *
   * The centre is clamped into the target room, because a room-relative
   * coordinate means something else in a different room and a table carried
   * from a hall into a small terrace would otherwise land beyond its far wall.
   *
   * The selection is dropped afterwards: the table is no longer drawn on this
   * room's canvas, and a properties panel editing something the owner cannot
   * see is the state `pruneSelection` exists to avoid.
   */
  async moveSelectedTableToRoom(roomId: string): Promise<void> {
    const table = this.selectedTable();
    const current = this.readyRoom();
    const target = this.roomsValue().find((room) => room.id === roomId);

    if (!table || !current || !target || target.id === current.id) {
      return;
    }

    this.rejectedLabel.set(undefined);
    this.mutate(
      withTableRoom(
        this.layout(),
        table.id,
        target.id,
        clampCentre(table.position, target.size),
      ),
    );
    this.selection.set([]);

    await this.toast.present({
      messageKey: 'floor-plan-table-moved',
      params: { label: table.label, room: target.name },
      outcome: 'success',
    });
  }

  setTableShape(shape: TableShape): void {
    const table = this.selectedTable();

    if (table) {
      this.mutate(withTableShapeChanged(this.layout(), table.id, shape));
    }
  }

  /**
   * Numbers the selected tables consecutively from `start`.
   *
   * The selection rather than the room, so an owner can number one row, one
   * section or the whole plan with the same control. Numbers held elsewhere in
   * the restaurant are skipped, so the helper cannot produce the collision
   * {@link renameTable} refuses one table at a time.
   */
  numberSelection(start: number = FIRST_TABLE_NUMBER): void {
    const ids = this.selectedTables().map((table) => table.id);

    if (ids.length === 0) {
      return;
    }

    this.rejectedLabel.set(undefined);
    this.mutate(
      numberedTables(this.layout(), ids, start, this.reservedLabels()),
    );
  }

  duplicateSelection(): void {
    const room = this.editedRoom();
    const ids = this.selection();

    if (!room || ids.length === 0) {
      return;
    }

    // One grid cell across and down, so the copy is visibly beside its original
    // and still on the grid the original was placed on.
    const step = this.snapSpacing() > 0 ? this.snapSpacing() : DUPLICATE_OFFSET;
    const offset: FloorPlanPoint = { x: step, y: step };
    const duplicated = duplicateIds(
      this.layout(),
      ids,
      offset,
      room.size,
      this.reservedLabels(),
    );

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
    this.selection.set(this.visibleIds());
  }

  undo(): void {
    this.history.update(undo);
    this.afterHistoryStep();
  }

  redo(): void {
    this.history.update(redo);
    this.afterHistoryStep();
  }

  /**
   * What has to be true again after the history moves.
   *
   * The selection is pruned of what the step took away, and a refused label is
   * dropped: it was a message about an edit that never landed, and the plan the
   * owner is now looking at is a different one.
   */
  private afterHistoryStep(): void {
    this.pruneSelection();
    this.rejectedLabel.set(undefined);
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
    const present = new Set(this.visibleIds());

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
        floor: draft.floor,
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

  // ------------------------------------------------ autosaving the draft

  /** The timer the debounce hangs on, cleared by a flush and by a publish. */
  private autosaveHandle: ReturnType<typeof setTimeout> | undefined;

  /**
   * Draft writes, chained so two never overlap.
   *
   * Each link re-reads the editor when it runs rather than closing over what
   * was on screen when it was queued, so a write that had to wait stores the
   * arrangement as it is now instead of one the owner has already moved past.
   */
  private draftWrites: Promise<void> = Promise.resolve();

  /** Whether the plan on screen differs from the draft that is stored. */
  readonly draftDirty = computed(() => {
    const room = this.readyRoom();

    if (!room) {
      return false;
    }

    const draft = this.draftValue();
    const tables = this.roomTables();

    return (
      !sameFields(openingFields(room, draft), this.currentFields()) ||
      layoutChanged(openingLayout(room, tables, draft), this.layout())
    );
  });

  /**
   * Stores the draft a moment after the owner stops changing it
   * (GitHub issue #1088).
   *
   * The effect re-runs on every edit and restarts the timer, which is the
   * whole debounce: a drag across a room is one write rather than one per
   * pointer release. It writes nothing while a publish is in flight, because
   * that publish is about to delete the draft.
   */
  private readonly autosave = effect(() => {
    const dirty = this.draftDirty();
    const ready = this.readyRoom() !== undefined;
    const blocked = this.draftStatus() === 'blocked';
    const publishing = this.pending();

    if (!dirty || !ready || blocked || publishing) {
      return;
    }

    untracked(() => this.scheduleDraftWrite());
  });

  private scheduleDraftWrite(): void {
    this.cancelScheduledDraftWrite();
    this.autosaveHandle = setTimeout(
      () => void this.queueDraftWrite(),
      DRAFT_AUTOSAVE_DELAY_MS,
    );
  }

  private cancelScheduledDraftWrite(): void {
    if (this.autosaveHandle !== undefined) {
      clearTimeout(this.autosaveHandle);
      this.autosaveHandle = undefined;
    }
  }

  private queueDraftWrite(): Promise<void> {
    this.draftWrites = this.draftWrites.then(() => this.writeDraft());

    return this.draftWrites;
  }

  /**
   * Stores the arrangement now, and waits for it.
   *
   * Called before anything that reseeds the editor - opening another room,
   * reordering the rooms, publishing - so the debounce window is never the
   * thing that loses an owner's last edit. It is also the reason opening
   * another room no longer asks whether to discard: there is nothing to
   * discard, because the draft has been stored.
   */
  async flushDraft(): Promise<void> {
    this.cancelScheduledDraftWrite();

    if (this.draftDirty() && this.draftStatus() !== 'blocked') {
      await this.queueDraftWrite();

      return;
    }

    await this.draftWrites;
  }

  private async writeDraft(): Promise<void> {
    const restaurantId = this.restaurantId();
    const room = this.readyRoom();

    if (
      !restaurantId ||
      !room ||
      this.draftStatus() === 'blocked' ||
      !this.draftDirty()
    ) {
      return;
    }

    const layout = this.layout();
    const fields = this.currentFields();
    const base = this.draftValue()?.revision ?? 0;

    this.draftStatus.set('saving');

    try {
      const saved = await this.dataAccess.saveDraft(
        restaurantId,
        room.id,
        {
          name: fields.name,
          size: fields.size,
          objects: layout.objects,
          tables: layout.tables,
          ...(fields.floor === undefined ? {} : { floor: fields.floor }),
        },
        base,
      );

      this.loadedDraft.set({ roomId: room.id, draft: saved });
      this.draftStatus.set('saved');
    } catch (error) {
      await this.reportDraftFailure(error);
    }
  }

  /**
   * What a refused draft write means, and why nothing is reseeded.
   *
   * A second device is arranging the same room. The plan on screen is the only
   * copy of itself, so it stays exactly where it is and autosave stops: the
   * owner is told, and can publish it, discard it or copy what they need. The
   * alternative - showing them the other device's draft - would throw away the
   * work autosave exists to protect.
   */
  private async reportDraftFailure(error: unknown): Promise<void> {
    if (error instanceof FloorPlanDraftConflictError) {
      this.draftStatus.set('blocked');

      await this.toast.present({
        messageKey: 'floor-plan-draft-conflict',
        outcome: 'failure',
      });

      return;
    }

    console.error('Failed to store the floor plan draft:', error);
    this.draftStatus.set('failed');
  }

  // ------------------------------------------------------------ publishing

  /**
   * Makes the arrangement on screen the plan everyone else reads
   * (GitHub issue #1088).
   *
   * ## Three writes, in this order
   *
   * The room document first, because it is the one the version rule guards: a
   * publish that lost a race has to be refused before any table is written, or
   * a conflict would leave tables from a plan the owner is about to be shown a
   * different version of. Tables follow, one write per table that actually
   * changed and one delete per table the owner removed - `saveRoom` sends only
   * the room document, so rearranging the furniture around a table never
   * rewrites it (issue #1081). The draft goes last, because it is the record
   * of what has *not* been published and deleting it before the writes landed
   * would be a lie.
   *
   * ## Why it asks for QR tokens
   *
   * [[Table]] gives every enabled table an active code, and until now the only
   * thing that asked was the sheet page of issue #1087 - so a plan carried
   * codes from the first time somebody opened the printable sheet. Publishing
   * is the moment the plan becomes real, so it is the moment to ask. Issuing
   * is idempotent, which is what lets both ask without either invalidating
   * what the other printed.
   *
   * A token failure does not fail the publish. The plan is written by then,
   * and the sheet page asks again anyway; unpublishing a correct plan because
   * a callable timed out would be the worse answer.
   */
  async publish(): Promise<void> {
    const restaurantId = this.restaurantId();
    const room = this.readyRoom();

    if (!restaurantId || !room) {
      return;
    }

    if (!this.validation().publishable) {
      await this.toast.present({
        messageKey: 'floor-plan-publish-blocked',
        outcome: 'failure',
      });

      return;
    }

    this.cancelScheduledDraftWrite();
    this.pending.set(true);

    const layout = this.layout();
    const fields = this.currentFields();

    try {
      const saved = await this.dataAccess.saveRoom(restaurantId, {
        ...room,
        name: fields.name,
        size: fields.size,
        objects: layout.objects,
        floor: fields.floor,
      });

      await this.writeTables(restaurantId, layout.tables);
      await this.dataAccess.discardDraft(restaurantId, room.id);

      this.loadedDraft.set({ roomId: room.id, draft: undefined });
      this.draftStatus.set('idle');

      // The whole restaurant's tables, because that is what the resource holds:
      // the rooms nobody touched, plus this room as it now stands.
      this.tables.set([...this.otherRoomTables(), ...layout.tables]);
      this.replaceRoom(saved);

      await this.issueTokens(restaurantId);

      await this.toast.present({
        messageKey: 'floor-plan-published',
        outcome: 'success',
      });
    } catch (error) {
      await this.reportSaveFailure(error);
    } finally {
      this.pending.set(false);
    }
  }

  /**
   * Asks the backend for the codes of the tables that were just published.
   *
   * The tables are re-read afterwards, because `qrTokenId` is backend-owned
   * (issue #1086) and the rules refuse a table write that changes it. Without
   * the re-read, the editor would hold tables missing the token the backend
   * has just written, and the *next* publish would try to write them back
   * without it and be refused.
   */
  private async issueTokens(restaurantId: string): Promise<void> {
    try {
      await this.dataAccess.issueTableQrTokens(restaurantId);
      this.tables.reload();
    } catch (error) {
      console.error('Failed to issue table QR codes after publishing:', error);
    }
  }

  /**
   * Throws the unpublished arrangement away and returns to the published plan.
   *
   * The only thing in the editor that destroys work, so the page confirms it
   * first. Everything else an owner does is either undoable or published.
   */
  async discardDraft(): Promise<void> {
    const restaurantId = this.restaurantId();
    const room = this.readyRoom();

    if (!restaurantId || !room || !this.hasDraft()) {
      return;
    }

    this.cancelScheduledDraftWrite();
    this.pending.set(true);

    try {
      await this.dataAccess.discardDraft(restaurantId, room.id);

      this.loadedDraft.set({ roomId: room.id, draft: undefined });
      this.draftStatus.set('idle');
      this.selection.set([]);
      this.rejectedLabel.set(undefined);
      // Nothing else in the stored plan's identity moved - same room, same
      // version, same tables - so the editor is told explicitly to start again.
      this.seedToken.update((token) => token + 1);

      await this.toast.present({
        messageKey: 'floor-plan-draft-discarded',
        outcome: 'success',
      });
    } catch (error) {
      console.error('Failed to discard the floor plan draft:', error);
      await this.toast.present({
        messageKey: 'floor-plan-draft-discard-failed',
        outcome: 'failure',
      });
    } finally {
      this.pending.set(false);
    }
  }

  /**
   * Opens the room a validation finding is about, and selects the table.
   *
   * The jump is the difference between a list of problems and a list of
   * problems an owner can act on: a duplicate label names a table in another
   * room, and hunting for it through the switcher is how a publish gate stops
   * being used.
   */
  async showIssue(issue: FloorPlanIssue): Promise<void> {
    if (issue.roomId !== this.readyRoom()?.id) {
      await this.selectRoom(issue.roomId);
    }

    this.select([issue.tableId]);
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
    const { changed, deleted } = tableWrites(this.roomTables(), tables);

    await Promise.all([
      ...changed.map((table) => this.dataAccess.saveTable(restaurantId, table)),
      ...deleted.map((id) => this.dataAccess.deleteTable(restaurantId, id)),
    ]);
  }

  /**
   * Moves a room up or down among the rooms of the restaurant
   * (GitHub issue #1085).
   *
   * The order the owner arranged is the order the room list, the room switcher
   * and every later reader see, so it is stored rather than derived: `order` is
   * reassigned from the room's new position and written, which is what makes it
   * survive a reload. A restaurant whose stored orders somehow collide or leave
   * gaps is healed by the first move, because the whole list is renumbered from
   * the top and only the documents that actually moved are written.
   *
   * Written one at a time rather than in parallel. Each write carries the
   * version rule of issue #1081, and a room that lost a race has to stop the
   * reorder rather than let the rest of the list land around it.
   *
   * A room whose version moves is a room the editor reseeds from, so an open
   * room with unsaved changes would lose them here. The page asks the owner
   * before that happens; nothing in this method can, because a toast cannot ask
   * a question.
   */
  async moveRoom(roomId: string, offset: number): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return;
    }

    // Reordering writes rooms, and a room whose version moved reseeds the
    // editor. Since issue #1088 that reseeds from the draft rather than from
    // the published plan, so the arrangement survives - as long as it has been
    // stored, which is what this waits for.
    await this.flushDraft();

    const before = this.roomsValue();
    const writes = reorderWrites(
      before,
      reorderedRooms(before, roomId, offset),
    );

    if (writes.length === 0) {
      return;
    }

    this.pending.set(true);

    try {
      for (const room of writes) {
        this.replaceRoom(await this.dataAccess.saveRoom(restaurantId, room));
      }

      await this.toast.present({
        messageKey: 'floor-plan-rooms-reordered',
        outcome: 'success',
      });
    } catch (error) {
      await this.reportSaveFailure(error);
    } finally {
      // Whatever landed, the list on screen is put in the order the stored
      // rooms now carry. A reorder that stopped half way through has moved some
      // of them, and showing the old arrangement would misreport what is saved.
      this.rooms.set(
        [...this.roomsValue()].sort((left, right) => left.order - right.order),
      );
      this.pending.set(false);
    }
  }

  async deleteRoom(room: Room): Promise<void> {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return;
    }

    this.pending.set(true);

    try {
      await this.dataAccess.deleteRoom(restaurantId, room.id);
      // Nothing cascades in Firestore, so a draft of the deleted room would
      // outlive it and be read again if the id were ever reused.
      await this.dataAccess.discardDraft(restaurantId, room.id);

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

  /**
   * Leaves the editor for the printable table codes (issue #1087).
   *
   * `navigateForward` rather than a plain `Router.navigate`, so the sheet
   * arrives with Ionic's forward animation and its back button returns to the
   * editor — the sheet is a step further into the plan, not a sibling page.
   *
   * The button that reaches this is closed while the plan holds unpublished
   * changes, because a table that exists only in a draft has no document and
   * therefore no token - so nothing here has to decide what to do about one.
   * Publishing is what gives it both (issue #1088).
   */
  gotoQrCodes(): void {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return;
    }

    void this.navController.navigateForward([
      'restaurant',
      restaurantId,
      'floor-plan',
      'qr-codes',
    ]);
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
