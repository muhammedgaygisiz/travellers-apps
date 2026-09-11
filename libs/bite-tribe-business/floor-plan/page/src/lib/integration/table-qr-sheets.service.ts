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
import { FloorPlanDataAccessService } from 'bite-tribe-business/floor-plan-data-access';
import { Restaurant, RestaurantTable, Room } from 'model';
import { resourceFailed, resourceValue } from 'utils';

export const RESTAURANT_COLLECTION = 'restaurants';

/** The room filter's "everything" entry, which is also its default. */
export const ALL_ROOMS = 'all';

/** The two ways a sheet is laid out on A4. */
export type TableQrSheetLayout = 'tent' | 'sticker';

/** One printable code: its token and the three lines of text beside it. */
export interface TableQrSheetRow {
  tableId: string;
  label: string;
  roomId: string;
  roomName: string;
  token: string;
}

/** Everything one restaurant's sheet is built from, as one load. */
export interface TableQrSheet {
  rows: TableQrSheetRow[];
  /**
   * Enabled tables the backend issued no token for.
   *
   * Not expected, and therefore shown rather than dropped: a row missing from
   * a sheet is indistinguishable from a table the owner forgot to place, and
   * an owner who prints twenty-three codes for twenty-four tables finds out by
   * walking the room.
   */
  missingTokenLabels: string[];
  /** Tables out of service, which get no code by design. */
  disabledLabels: string[];
}

/**
 * The room a sheet row belongs to, named rather than referenced.
 *
 * A room deleted between the plan load and the sheet cannot happen — a room
 * holding tables refuses to be deleted — but a table whose `roomId` names
 * nothing is still representable, so it falls back to an empty name and the
 * row prints the restaurant and the table number it does know.
 */
const roomNames = (rooms: Room[]): Map<string, string> =>
  new Map(rooms.map((room) => [room.id, room.name]));

/**
 * The sheet's rows, in the order the owner walks the room.
 *
 * By room first, in the display order the owner arranged, then by table label
 * within it — and the label numerically where it is a number, so table 2 comes
 * before table 10 rather than after it. A sheet of stickers is peeled off in
 * order and carried around the room, so the order on paper is the route.
 */
const sheetOrder =
  (rooms: Room[]) =>
  (a: TableQrSheetRow, b: TableQrSheetRow): number => {
    const order = (roomId: string): number =>
      rooms.findIndex((room) => room.id === roomId);
    const byRoom = order(a.roomId) - order(b.roomId);

    return byRoom !== 0
      ? byRoom
      : a.label.localeCompare(b.label, undefined, { numeric: true });
  };

/**
 * The printable table codes of one restaurant (GitHub issue \#1087).
 *
 * ## Why the tokens are asked for on load
 *
 * Issuing is idempotent: a table already holding an active token is reported
 * back unchanged and nothing is written. So the page asks as part of loading
 * rather than behind a button, and an owner who has just built a plan reaches
 * a sheet that is ready to print instead of one that first explains it needs
 * codes. The same call is what issue \#1088's publish step makes, and
 * neither invalidates what the other printed.
 *
 * ## Why the tokens come off the call and not off the tables
 *
 * `issueTableQrTokens` writes `qrTokenId` onto the tables it mints for, so the
 * tables read a moment earlier are stale for exactly the tables that matter.
 * The call returns the token per table, which is both fresher and one fewer
 * read.
 *
 * ## What the owner chooses
 *
 * The layout, the room, and which tables. All three are viewport state and are
 * stored nowhere — a sheet is printed and thrown away, and the plan is what
 * outlives it. The selection resets when the room filter moves, because a
 * selection that survived the filter would print tables the owner can no
 * longer see.
 */
@Injectable({ providedIn: 'root' })
export class TableQrSheetsService {
  private readonly dataAccess = inject(FloorPlanDataAccessService);
  private readonly storeService = inject(BiteTribeStoreService);

  /**
   * The route parameter, for the reason `FloorPlanService` reads it that way:
   * `restaurant$` is undefined without a GPS position, and this page is
   * reachable by a bookmarked URL that never passed through the editor.
   */
  readonly restaurantId = this.storeService.restaurantIdFromUrl;

  readonly roomsLoader: ResourceLoader<
    Room[] | undefined,
    { restaurantId: string | undefined }
  > = async ({ params }) =>
    params.restaurantId ? this.dataAccess.loadRooms(params.restaurantId) : [];

  readonly rooms = resource({
    params: () => ({ restaurantId: this.restaurantId() }),
    loader: this.roomsLoader.bind(this),
  });

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

  /**
   * The rooms once they have actually arrived, and `undefined` until then.
   *
   * The same read as `roomsValue` without its empty-list fallback, and the
   * difference is what the sheet below is keyed on. An empty list is a real
   * answer — a restaurant with no rooms — and it is also what a read that is
   * still running and a read that failed both resolve to. Telling those apart
   * is what stops the sheet asking the backend for tokens twice on every load,
   * once against no rooms and once against the real ones, and what stops a
   * failed room read producing a sheet of codes with a blank room name on
   * them.
   */
  private readonly settledRooms = resourceValue(this.rooms);

  /**
   * The tables, their tokens and the rooms they stand in, joined.
   *
   * Keyed on {@link settledRooms} as well as the restaurant, so the join runs
   * once and only against a plan that is fully there.
   */
  readonly sheetLoader: ResourceLoader<
    TableQrSheet | undefined,
    { restaurantId: string | undefined; rooms: Room[] | undefined }
  > = async ({ params }) => {
    const { restaurantId, rooms } = params;

    if (!restaurantId || !rooms) {
      return { rows: [], missingTokenLabels: [], disabledLabels: [] };
    }

    const [tables, issued] = await Promise.all([
      this.dataAccess.loadTables(restaurantId),
      this.dataAccess.issueTableQrTokens(restaurantId),
    ]);

    const tokens = new Map(
      issued.tokens.map(({ tableId, token }) => [tableId, token]),
    );
    const names = roomNames(rooms);
    const enabled = tables.filter((table) => table.enabled);

    const rows = enabled
      .filter((table) => tokens.has(table.id))
      .map((table) => ({
        tableId: table.id,
        label: table.label,
        roomId: table.roomId,
        roomName: names.get(table.roomId) ?? '',
        token: tokens.get(table.id) ?? '',
      }))
      .sort(sheetOrder(rooms));

    return {
      rows,
      missingTokenLabels: enabled
        .filter((table) => !tokens.has(table.id))
        .map((table) => table.label),
      disabledLabels: tables
        .filter((table: RestaurantTable) => !table.enabled)
        .map((table) => table.label),
    };
  };

  readonly sheet = resource({
    params: () => ({
      restaurantId: this.restaurantId(),
      rooms: this.settledRooms(),
    }),
    loader: this.sheetLoader.bind(this),
  });

  private readonly sheetValue = resourceValue(this.sheet);
  private readonly roomsFailed = resourceFailed(this.rooms);
  private readonly sheetFailed = resourceFailed(this.sheet);

  readonly loading = computed(
    () => this.rooms.isLoading() || this.sheet.isLoading(),
  );

  /**
   * True once either read has failed, and the page's only terminal state.
   *
   * Separate from the value because a failed read resolves to nothing through
   * `resourceValue`, and a page that took that at face value would tell an
   * owner with twenty tables that they have no codes to print.
   */
  readonly loadFailed = computed(
    () => this.roomsFailed() || this.sheetFailed(),
  );

  readonly restaurantName = computed(() => this.restaurantValue()?.name ?? '');
  readonly rows = computed(() => this.sheetValue()?.rows ?? []);
  readonly missingTokenLabels = computed(
    () => this.sheetValue()?.missingTokenLabels ?? [],
  );
  readonly disabledLabels = computed(
    () => this.sheetValue()?.disabledLabels ?? [],
  );

  private readonly layoutChoice = signal<TableQrSheetLayout>('sticker');
  private readonly roomChoice = signal<string>(ALL_ROOMS);

  readonly layout = this.layoutChoice.asReadonly();
  readonly room = this.roomChoice.asReadonly();

  /** The rooms that actually hold a printable table, plus "all rooms". */
  readonly filterRooms = computed(() => {
    const held = new Set(this.rows().map((row) => row.roomId));

    return this.roomsValue().filter((room) => held.has(room.id));
  });

  readonly visibleRows = computed(() => {
    const room = this.roomChoice();

    return room === ALL_ROOMS
      ? this.rows()
      : this.rows().filter((row) => row.roomId === room);
  });

  /**
   * Which tables print, defaulting to all of the visible ones.
   *
   * A `linkedSignal` so the default follows the filter and the load without an
   * effect writing state: an owner who filters to the terrace gets the terrace
   * selected, and one who came to reprint a single replacement unticks the
   * rest. Printing nothing is reachable and is refused by the button rather
   * than by silently printing everything.
   */
  private readonly selection = linkedSignal<TableQrSheetRow[], Set<string>>({
    source: this.visibleRows,
    computation: (rows) => new Set(rows.map((row) => row.tableId)),
  });

  readonly selectedIds = this.selection.asReadonly();

  readonly selectedRows = computed(() => {
    const selected = this.selection();

    return this.visibleRows().filter((row) => selected.has(row.tableId));
  });

  readonly isAuthenticated = toSignal(this.storeService.isAuthenticated$, {
    initialValue: false,
  });

  setLayout(layout: TableQrSheetLayout): void {
    this.layoutChoice.set(layout);
  }

  setRoom(roomId: string): void {
    this.roomChoice.set(roomId);
  }

  toggleTable(tableId: string): void {
    this.selection.update((selected) => {
      const next = new Set(selected);

      if (!next.delete(tableId)) {
        next.add(tableId);
      }

      return next;
    });
  }

  /** Ticks or unticks every visible table in one action. */
  selectAll(selected: boolean): void {
    this.selection.set(
      selected
        ? new Set(this.visibleRows().map((row) => row.tableId))
        : new Set<string>(),
    );
  }

  /**
   * Hands the page to the browser's own print dialog.
   *
   * The sheet on screen and the sheet on paper are one DOM tree relaid by a
   * print stylesheet, rather than a second document opened in a window — a
   * popup is blocked by default in every browser this app runs in, and the
   * failure is silent. It also means `Ctrl`/`Cmd`+`P` produces exactly what
   * the button does.
   */
  print(): void {
    window.print();
  }

  logout(): void {
    this.storeService.logout();
  }
}
