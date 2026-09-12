import {
  computed,
  DestroyRef,
  effect,
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
import {
  TableStateDataAccessService,
  tableTransitionFailure,
  TableTransitionFailure,
} from 'bite-tribe-business/table-management-data-access';
import {
  Restaurant,
  RestaurantTable,
  Room,
  TableState,
  TableStatus,
} from 'model';
import { EMPTY, switchMap } from 'rxjs';
import { ToastService } from 'toast';
import { resourceFailed, resourceValue } from 'utils';
import {
  canFreeTable,
  guestCountReason,
  TableAction,
  TableActionRequest,
  tableActions,
} from './table-actions';
import {
  isTimedStatus,
  liveRoomItems,
  TableStatusCopy,
} from './table-plan-items';
import {
  mergeOptimistic,
  OptimisticTransition,
  prunedOptimistic,
} from './table-plan-optimistic';
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

/**
 * What each refused transition is called in front of a staff member
 * (GitHub issue #1094).
 *
 * Four sentences rather than one, because they lead to different next moves: a
 * conflict means look at the plan, a refusal means the table cannot do that, a
 * permission failure means sign in again, and everything else means try again.
 */
export const FAILURE_KEYS: Readonly<Record<TableTransitionFailure, string>> = {
  conflict: 'table-action-conflict',
  'not-allowed': 'table-action-not-allowed',
  permission: 'table-action-permission',
  unknown: 'table-action-failed',
};

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
 * here and never written: this service reads rooms and tables, listens to
 * table states, and asks the backend to change one - and there is no path
 * through it that stores a room, a table or a geometry of any kind. Even the
 * state changes of issue #1094 go through `transitionTableState` rather than
 * through Firestore, because issue #1092 made the backend the only writer and
 * `firestore.rules` refuses every client write to the collection.
 *
 * ## The view moves first
 *
 * A transition is drawn the moment it is asked for and taken back if the
 * backend disagrees, because the alternative is a table that does not change
 * colour while a party stands in front of the host - which reads as a tap that
 * missed and is answered with a second tap the backend then refuses. The guess
 * is a layer over the listener rather than a write into it, so a rollback is a
 * deletion and the truth is still underneath. See `table-plan-optimistic.ts`.
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
  private readonly toast = inject(ToastService);

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

  /** The states exactly as the server last described them. */
  private readonly liveStates = computed(() =>
    statesByTable(this.states() ?? []),
  );

  /**
   * The tables whose transition is in flight or not yet delivered.
   *
   * The whole of the optimistic behaviour is this map and the merge below.
   * See `table-plan-optimistic.ts` for why the guess is a layer over the
   * listener rather than a write into it.
   */
  private readonly optimistic = signal<
    ReadonlyMap<string, OptimisticTransition>
  >(new Map());

  /** What the view draws: the server's answer, with the guesses laid over it. */
  private readonly statesByTable = computed(() =>
    mergeOptimistic(
      this.liveStates(),
      this.optimistic(),
      this.restaurantId() ?? '',
    ),
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

    /*
     * A guess comes off once the listener is saying the same thing.
     *
     * In an effect rather than in the merge, because dropping it is a write
     * and the merge is a computed. Writing `optimistic` re-runs this effect,
     * which then finds nothing left to prune and stops - the second pass is
     * the terminating one rather than a wasted one.
     */
    effect(() => {
      const pending = this.optimistic();

      if (pending.size === 0) {
        return;
      }

      const next = prunedOptimistic(this.liveStates(), pending);

      if (next) {
        this.optimistic.set(next);
      }
    });
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
   * table, and a selection of several is the end-of-service reset below, which
   * has a bar of its own rather than a detail panel. The note lives here rather
   * than on the drawing because it is a sentence - "wobbly leg", "held for the
   * 20:00 birthday" - and a sentence does not fit on a 900 mm round table.
   */
  readonly selectedTable = computed<TableDetail | undefined>(() => {
    const ids = this.selectedIds();

    return ids.length === 1 ? this.detailOf(ids[0]) : undefined;
  });

  /**
   * Which table's actions are open, or nothing (GitHub issue #1094).
   *
   * Kept apart from the selection because they answer different questions. A
   * selected table is the one being *looked* at, and the detail panel stays
   * beside the plan after the sheet closes; an open sheet is a table being
   * acted on, and it must close the moment the action is picked.
   */
  private readonly actionsFor = signal<string | undefined>(undefined);

  /** The table the sheet is about, described exactly as the panel describes it. */
  readonly actionTarget = computed<TableDetail | undefined>(() =>
    this.detailOf(this.actionsFor()),
  );

  /**
   * What that table may be asked to do.
   *
   * Derived from its *current* status, so a table somebody else moves while
   * the sheet is open re-offers itself: the buttons change under the hand
   * rather than staying to be refused. `tableActions` reads the transition
   * matrix, which is the single definition the backend validates against.
   */
  readonly actions = computed<TableAction[]>(() => {
    const target = this.actionTarget();

    return target ? tableActions(target.status) : [];
  });

  /**
   * One table's detail, or nothing when it is not a table of this restaurant.
   *
   * Shared by the panel and the sheet so the two cannot disagree about what a
   * table is doing while both are on screen.
   */
  private detailOf(tableId: string | undefined): TableDetail | undefined {
    const table = this.tablesValue().find(
      (candidate) => candidate.id === tableId,
    );

    if (!table) {
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
  }

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
    this.clearSelection();
  }

  /**
   * What a tap on the plan leaves selected.
   *
   * One table, except while the end-of-service reset is being assembled, where
   * a tap adds or removes instead. The canvas cannot help with that: read-only
   * it reports every tap as "this table alone", because a shift-click is not a
   * gesture a host holding a tablet has. So the toggle is here, over a
   * selection this service already owns.
   */
  select(ids: readonly string[]): void {
    // Geometry is not selectable here. Selecting a wall in the editor is how it
    // is moved; on this view it would open a detail panel about a wall.
    const tables = new Set(this.tablesValue().map((table) => table.id));
    const picked = ids.filter((id) => tables.has(id));

    if (!this.bulk() || picked.length === 0) {
      // An empty selection is the plan being tapped beside a table, or escape.
      // It clears in both modes rather than toggling nothing.
      this.selected.set(picked);

      return;
    }

    const current = new Set(this.selectedIds());

    picked.forEach((id) =>
      current.has(id) ? current.delete(id) : current.add(id),
    );

    this.selected.set([...current]);
  }

  /**
   * A table held, or entered on.
   *
   * The gesture issue #1093 left landing on a selection is what opens the
   * actions now, which is the acceptance criterion about one interaction:
   * from the live view, the table and the sheet are one gesture apart and
   * seating is the first button in it.
   *
   * While the reset is being assembled it stays a selection. A host adding a
   * twelfth table to a batch has not asked to act on that table alone.
   */
  activateTable(tableId: string): void {
    this.select([tableId]);

    if (!this.bulk()) {
      this.actionsFor.set(tableId);
    }
  }

  closeActions(): void {
    this.actionsFor.set(undefined);
  }

  clearSelection(): void {
    this.selected.set([]);
    this.actionsFor.set(undefined);
  }

  /**
   * Whether staff are assembling a batch rather than reading one table
   * (GitHub issue #1094).
   *
   * A mode rather than a modifier key, because the surface it exists for is a
   * tablet at the end of a service: somebody clearing a room of thirty covers
   * taps thirty tables and then presses one button, and every one of those
   * taps has to mean "and this one too" without a keyboard.
   */
  private readonly bulk = signal(false);

  readonly bulkMode = this.bulk.asReadonly();

  /** How many tables are in the batch, whatever they are doing. */
  readonly selectedCount = computed(() => this.selectedIds().length);

  /**
   * The tables in the batch that can actually be freed, with what they are
   * doing now.
   *
   * The reset applies to these and leaves the rest alone, rather than sending
   * every selected table to the backend and collecting refusals: a table
   * already free has nothing to reset, and a party still ordering is not one
   * anybody meant to clear. The status is carried along because the callable
   * needs it - it is the `expectedStatus` that turns a race into a sentence.
   */
  private readonly freeable = computed(() => {
    const ids = new Set(this.selectedIds());
    const states = this.statesByTable();

    return this.tablesValue()
      .filter((table) => ids.has(table.id))
      .map((table) => ({ table, status: statusOfTable(table, states) }))
      .filter(({ status }) => canFreeTable(status));
  });

  /** How many of the selected tables the reset would actually free. */
  readonly freeableCount = computed(() => this.freeable().length);

  private readonly resetting = signal(false);

  /** Whether a reset is still running, so it cannot be started twice. */
  readonly bulkBusy = this.resetting.asReadonly();

  /**
   * Enters or leaves the batch, always with an empty selection.
   *
   * Carrying a selection across the boundary would mean the first tap after
   * switching either acted on a table picked for a different purpose, or
   * silently dropped it. Neither is something a host would predict.
   */
  toggleBulkMode(): void {
    this.bulk.update((current) => !current);
    this.clearSelection();
  }

  /** Every table standing in the open room, for a reset of the whole of it. */
  selectAllInRoom(): void {
    if (!this.bulk()) {
      return;
    }

    this.selected.set(this.roomTables().map((table) => table.id));
  }

  /**
   * The end-of-service reset: free everything in the batch that can be freed.
   *
   * Every table is its own transition, because that is what the backend
   * offers and what the audit trail should record - thirty tables cleared is
   * thirty entries naming who cleared them, not one entry naming a room. They
   * go in parallel rather than in sequence: each is an independent
   * transaction on its own document, and a host waiting out thirty round trips
   * one after another is a host who taps the button again.
   *
   * One toast at the end rather than one per table. A batch that half worked
   * has to say so in a sentence somebody reads once.
   */
  async freeSelectedTables(): Promise<void> {
    const targets = this.freeable();

    if (targets.length === 0 || this.resetting()) {
      return;
    }

    this.resetting.set(true);

    try {
      const outcomes = await Promise.all(
        targets.map(({ table, status }) =>
          this.transition(table.id, status, 'available'),
        ),
      );
      const freed = outcomes.filter(Boolean).length;

      this.selected.set([]);

      await this.toast.present(
        freed === targets.length
          ? {
              messageKey: 'table-bulk-freed',
              params: { count: freed },
              outcome: 'success',
            }
          : {
              messageKey: 'table-bulk-freed-partial',
              params: { count: freed, total: targets.length },
              outcome: 'failure',
            },
      );
    } finally {
      this.resetting.set(false);
    }
  }

  /**
   * Applies what the sheet reported, and closes it.
   *
   * Closed first, before the request is even made. The plan behind it already
   * shows the new status - that is what the optimistic layer is for - and a
   * sheet left open over a table that has visibly changed invites the second
   * tap this whole design exists to avoid.
   */
  async applyAction({ to, guests }: TableActionRequest): Promise<void> {
    const target = this.actionTarget();

    this.closeActions();

    if (!target) {
      return;
    }

    await this.transition(target.table.id, target.status, to, guests);
  }

  /**
   * One transition: shown immediately, undone if the backend disagrees.
   *
   * Answers whether it was accepted rather than throwing, because the caller
   * that matters is the batch, and one table refusing a reset must not abandon
   * the other twenty-nine. The single-table path has already reported through
   * the toast by the time it returns.
   */
  private async transition(
    tableId: string,
    from: TableStatus,
    to: TableStatus,
    guests?: number,
  ): Promise<boolean> {
    const restaurantId = this.restaurantId();

    if (!restaurantId) {
      return false;
    }

    const since = Date.now();

    this.show(tableId, { status: to, since });

    try {
      const result = await this.tableStates.transition({
        restaurantId,
        tableId,
        status: to,
        expectedStatus: from,
        ...(guests === undefined ? {} : { reason: guestCountReason(guests) }),
      });

      // Kept on screen until the listener delivers the transition itself, so
      // the table does not flick back to its old status in the gap between the
      // callable answering and the snapshot arriving.
      this.show(tableId, { status: to, since, confirmedSince: result.since });

      return true;
    } catch (error) {
      this.rollback(tableId);
      await this.reportFailure(error);

      return false;
    }
  }

  private show(tableId: string, entry: OptimisticTransition): void {
    this.optimistic.update((current) => new Map(current).set(tableId, entry));
  }

  /**
   * Drops the guess, which puts the table back to whatever the listener last
   * said.
   *
   * That is the whole rollback. Nothing has to reconstruct the old status from
   * the error, because the old status was never overwritten - it is still
   * underneath.
   */
  private rollback(tableId: string): void {
    this.optimistic.update((current) => {
      const next = new Map(current);

      next.delete(tableId);

      return next;
    });
  }

  /**
   * Says why a transition did not happen, in the terms the staff member is
   * standing in.
   *
   * The conflict is the one worth spelling out: the table did not fail to
   * change, it changed to something else because a colleague got there first,
   * and the plan is already showing what. Saying "try again" there would send
   * a host to re-seat a table that is occupied.
   */
  private async reportFailure(error: unknown): Promise<void> {
    console.error('Failed to change the table state:', error);

    await this.toast.present({
      messageKey: FAILURE_KEYS[tableTransitionFailure(error)],
      outcome: 'failure',
    });
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
