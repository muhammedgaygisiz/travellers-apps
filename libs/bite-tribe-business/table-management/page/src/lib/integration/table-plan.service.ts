import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  resource,
  ResourceLoader,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FirebaseFirestore } from '@capacitor-firebase/firestore';
import { TranslocoService } from '@jsverse/transloco';
import { BiteTribeStoreService } from 'bite-tribe/store';
import { FloorPlanDataAccessService } from 'bite-tribe-business/floor-plan-data-access';
import {
  FloorPlanItem,
  tableStatusMark,
} from 'bite-tribe-business/floor-plan-ui';
import { TableStateDataAccessService } from 'bite-tribe-business/table-management-data-access';
import {
  Restaurant,
  RestaurantTable,
  Room,
  TableState,
  TableStatus,
} from 'model';
import { EMPTY, switchMap } from 'rxjs';
import { resourceFailed, resourceValue } from 'utils';
import {
  isTimedStatus,
  liveRoomItems,
  TableStatusCopy,
} from './table-plan-items';
import {
  statesByTable,
  statusCounts,
  statusOfTable,
  summaryRows,
} from './table-plan-summary';
import { elapsedParts } from './table-status-duration';

export const RESTAURANT_COLLECTION = 'restaurants';

/**
 * How often the durations on the plan are recomputed.
 *
 * Half a minute, because the durations are whole minutes: a shorter tick would
 * re-render the room to redraw the same text, and a longer one would leave a
 * table reading `4 min` for most of its fifth. It has nothing to do with how
 * quickly a *state* change arrives - that is a Firestore listener and is
 * immediate. This is only the clock moving.
 */
export const DURATION_TICK_MS = 30_000;

/** One table as the detail beside the plan shows it. */
export interface TableDetail {
  table: RestaurantTable;
  status: TableStatus;
  /** The status in the reader's language. */
  statusLabel: string;
  /** How long it has been in that status, or nothing for a free table. */
  duration?: string;
  /** The free-text note staff left on it, when there is one. */
  note?: string;
}

/**
 * The live room, as staff read it during service (GitHub issue #1093).
 *
 * ## What it is not
 *
 * It is not the editor at a different permission. The floor plan is *published*
 * here and never written: this service reads rooms and tables and listens to
 * table states, and there is no path through it that stores a room, a table or
 * a state. Writing a state at all is issue #1094, and even then it goes through
 * `transitionTableState` rather than through Firestore, because issue #1092
 * made the backend the only writer and `firestore.rules` refuses every client
 * write to the collection.
 *
 * ## Which restaurant
 *
 * The route parameter, for the reason the floor-plan editor, the menu and the
 * staff list all read it that way: `restaurant$` is a derived selector that is
 * `undefined` whenever there is no GPS position, which is an ordinary state for
 * anyone who declined the location permission, and this page is reachable by
 * direct URL. The route always carries `:restaurantId`, and it is the id the
 * route guard and the Firestore rules both authorise against.
 *
 * ## One listener for the whole restaurant
 *
 * The states are listened to per restaurant and filtered to the open room here,
 * so switching rooms is a recomputation rather than a new subscription and a
 * fresh set of first-snapshot reads. Staff move between the terrace and the
 * dining room constantly during one service, and the rooms of one restaurant
 * are a handful of documents.
 */
@Injectable({ providedIn: 'root' })
export class TablePlanService {
  private readonly floorPlan = inject(FloorPlanDataAccessService);
  private readonly tableStates = inject(TableStateDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);
  private readonly transloco = inject(TranslocoService);

  readonly restaurantId = this.storeService.restaurantIdFromUrl;

  readonly roomsLoader: ResourceLoader<
    Room[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    return restaurantId ? this.floorPlan.loadRooms(restaurantId) : [];
  };

  readonly rooms = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.roomsLoader.bind(this),
  });

  readonly tablesLoader: ResourceLoader<
    RestaurantTable[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) => {
    const { restaurantId } = params;

    return restaurantId ? this.floorPlan.loadTables(restaurantId) : [];
  };

  /**
   * Every table of the restaurant, not of the open room.
   *
   * For the same reason the states are read whole: a room switch is then a
   * filter rather than a round trip, and the summary bar can say what the
   * *restaurant* is doing as well as what the room is.
   */
  readonly tables = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.tablesLoader.bind(this),
  });

  /**
   * The restaurant, read for its name.
   *
   * A page headed "Tables" showing a room called "Terrace" does not say whose
   * terrace it is, and a staff account may work at a restaurant whose name is
   * the only thing distinguishing it from the last shift.
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
  readonly tablesValue = resourceValue(this.tables, [] as RestaurantTable[]);
  readonly restaurantValue = resourceValue(this.restaurant);

  readonly loading = computed(
    () => this.rooms.isLoading() || this.tables.isLoading(),
  );

  /**
   * True once the plan could not be read.
   *
   * Kept apart from the value so the page has a terminal state: a failed read
   * resolves to an empty list through `resourceValue`, and a page that took
   * that at face value would tell staff their restaurant has no rooms in the
   * middle of a service.
   */
  private readonly roomsFailed = resourceFailed(this.rooms);
  private readonly tablesFailed = resourceFailed(this.tables);

  readonly loadFailed = computed(
    () => this.roomsFailed() || this.tablesFailed(),
  );

  readonly isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  readonly restaurantName = computed(() => this.restaurantValue()?.name ?? '');

  /**
   * The live states, pushed by Firestore rather than polled.
   *
   * `undefined` until the first snapshot arrives, which is what
   * {@link isLive} reports: a plan drawn from no snapshot at all is a plan of
   * defaults, and staff have to be able to tell that from a room where
   * everything genuinely is free.
   */
  private readonly states = toSignal(
    this.storeService.restaurantIdFromUrl$.pipe(
      switchMap((restaurantId) =>
        restaurantId ? this.tableStates.tableStates$(restaurantId) : EMPTY,
      ),
    ),
  );

  /** Whether what is on screen has been confirmed by the server. */
  readonly isLive = computed(() => this.states() !== undefined);

  private readonly statesByTable = computed(() =>
    statesByTable(this.states() ?? []),
  );

  /**
   * The wall clock, ticked so the durations on the plan advance.
   *
   * An interval rather than an animation frame: the numbers are whole minutes,
   * and a room redrawn sixty times a second to show the same text would cost a
   * tablet its battery through a whole service.
   */
  private readonly now = signal(Date.now());

  /**
   * The language, so the status words and durations are recomputed when it
   * changes.
   *
   * Read as a signal rather than translated once, because `translate()` is a
   * plain call and a computed that made it would never re-run: the plan would
   * keep the words of whichever language happened to be active when the room
   * was opened.
   */
  private readonly language = toSignal(this.transloco.langChanges$, {
    initialValue: this.transloco.getActiveLang(),
  });

  constructor() {
    const tick = setInterval(() => this.now.set(Date.now()), DURATION_TICK_MS);

    inject(DestroyRef).onDestroy(() => clearInterval(tick));
  }

  /**
   * Which room staff picked, or nothing while they have picked none.
   *
   * Kept apart from the resolved room so the first room of a freshly loaded
   * restaurant is open without anybody having chosen it, and so a state change
   * arriving does not reset the choice.
   */
  private readonly requestedRoomId = signal<string | undefined>(undefined);

  readonly selectedRoom = computed<Room | undefined>(() => {
    const rooms = this.roomsValue();
    const requested = this.requestedRoomId();

    return rooms.find((room) => room.id === requested) ?? rooms[0];
  });

  /** The published plan of the open room, with the service drawn on it. */
  readonly items = computed<FloorPlanItem[]>(() =>
    liveRoomItems(
      this.selectedRoom(),
      this.tablesValue(),
      this.statesByTable(),
      (status, state) => this.statusCopy(status, state),
    ),
  );

  /** The tables standing in the open room. */
  private readonly roomTables = computed<RestaurantTable[]>(() => {
    const roomId = this.selectedRoom()?.id;

    return this.tablesValue().filter((table) => table.roomId === roomId);
  });

  /** What the open room is doing, counted for the summary bar. */
  readonly summary = computed(() =>
    summaryRows(statusCounts(this.roomTables(), this.statesByTable())),
  );

  /** How many tables the open room holds, so a zero summary has a reason. */
  readonly roomTableCount = computed(() => this.roomTables().length);

  private readonly selected = signal<string[]>([]);

  readonly selectedIds = this.selected.asReadonly();

  /**
   * The one table staff have picked, with everything the plan could not fit on
   * it.
   *
   * A single table rather than a selection: the plan is read to act on one
   * table, and the bulk end-of-service reset that acts on several is issue
   * #1094. The note lives here rather than on the drawing because it is a
   * sentence - "wobbly leg", "held for the 20:00 birthday" - and a sentence
   * does not fit on a 900 mm round table.
   */
  readonly selectedTable = computed<TableDetail | undefined>(() => {
    const ids = this.selectedIds();
    const table = this.tablesValue().find((candidate) =>
      ids.includes(candidate.id),
    );

    if (!table || ids.length !== 1) {
      return undefined;
    }

    const states = this.statesByTable();
    const state = states.get(table.id);
    const status = statusOfTable(table, states);
    const { label, duration } = this.statusCopy(status, state);

    return {
      table,
      status,
      statusLabel: label,
      ...(duration === undefined ? {} : { duration }),
      ...(state?.note === undefined ? {} : { note: state.note }),
    };
  });

  /** The translated status name, for the summary bar and the detail. */
  statusLabel(status: TableStatus): string {
    // Read so the computed depending on this re-runs on a language change.
    this.language();

    return this.transloco.translate(tableStatusMark(status).labelKey);
  }

  selectRoom(roomId: string): void {
    this.requestedRoomId.set(roomId);
    // The selection belongs to the room it was made in: keeping it would leave
    // the detail panel describing a table in a room that is no longer on
    // screen.
    this.selected.set([]);
  }

  select(ids: readonly string[]): void {
    // Geometry is not selectable here. Selecting a wall in the editor is how it
    // is moved; on this view it would open a detail panel about a wall.
    const tables = new Set(this.tablesValue().map((table) => table.id));

    this.selected.set(ids.filter((id) => tables.has(id)));
  }

  /**
   * A table held rather than tapped.
   *
   * Selecting it is the whole of the answer for now, which is what puts the
   * table's detail on screen. The actions themselves are issue #1094, and this
   * is the hook they arrive at, so the gesture exists and lands somewhere real
   * rather than being added later with the sheet.
   */
  activateTable(tableId: string): void {
    this.select([tableId]);
  }

  clearSelection(): void {
    this.selected.set([]);
  }

  logout(): void {
    this.storeService.logout();
  }

  /**
   * The status and the duration, in the reader's language.
   *
   * One place rather than two, because the plan and the detail beside it say
   * the same thing about the same table and a reader comparing them would spot
   * any disagreement immediately.
   */
  private statusCopy(
    status: TableStatus,
    state: TableState | undefined,
  ): TableStatusCopy {
    const label = this.statusLabel(status);

    if (!state || !isTimedStatus(status)) {
      return { label };
    }

    const { key, params } = elapsedParts(state.since, this.now());

    return { label, duration: this.transloco.translate(key, params) };
  }
}
