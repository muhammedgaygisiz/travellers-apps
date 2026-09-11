import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  AlertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonItemDivider,
  IonLabel,
  IonList,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FLOOR_PLAN_PALETTE,
  FloorPlanCanvasCommand,
  FloorPlanCanvasComponent,
  FloorPlanItem,
  FloorPlanPaletteEntry,
  FloorPlanPlacement,
  GRID_SPACINGS,
  PALETTE_DRAG_TYPE,
  PALETTE_PREVIEW_EXTENT,
  formatMetres,
  isTableVariant,
  metresToMillimetres,
  millimetresToMetres,
  roomCentre,
} from 'bite-tribe-business/floor-plan-ui';
import { PageComponent } from 'common/ui/page';
import {
  FloorPlanSize,
  Millimetres,
  RestaurantTable,
  Room,
  TableShape,
} from 'model';
import {
  EMPTY_CAPACITY,
  RestaurantCapacity,
  RoomCapacity,
  floorGroups,
  hasFloors,
} from '../integration/floor-plan-rooms';
import {
  FIRST_TABLE_NUMBER,
  MAX_TABLE_SEATS,
  MIN_TABLE_SEATS,
  TableLabelConflict,
} from '../integration/floor-plan-tables';
import { RoomDraft } from '../integration/room-draft';

/**
 * The size the first room of a restaurant starts at.
 *
 * A room rather than an empty canvas, because "create a room" and "set its
 * dimensions" are two steps and only the second one needs a form. Six by eight
 * metres is a plausible small dining room, so the plan is immediately to scale
 * and the owner corrects two numbers instead of inventing them from nothing.
 */
export const DEFAULT_ROOM_WIDTH_MM: Millimetres = 6000;
export const DEFAULT_ROOM_HEIGHT_MM: Millimetres = 8000;

/** A room narrower than half a metre is a typo, not a room. */
export const MIN_ROOM_SIDE_METRES = 0.5;

/**
 * Two hundred metres a side.
 *
 * Larger than any dining room and far short of the point where the grid
 * pattern becomes a solid fill, so a slipped decimal point is refused instead
 * of rendering a plan nobody can find their tables in.
 */
export const MAX_ROOM_SIDE_METRES = 200;

/** The form's fields, plus the room identity and version they came from. */
interface RoomFormValues {
  id: string;
  version: number;
  name: string;
  floor: string;
  width: string;
  height: string;
}

/** One room in the switcher: what it holds, and where it can still move to. */
export interface RoomRow {
  room: Room;
  capacity: RoomCapacity;
  /** Already the first room of the restaurant, so it cannot move up. */
  first: boolean;
  /** Already the last, so it cannot move down. */
  last: boolean;
}

/** One level of the restaurant in the switcher, and the rooms on it. */
export interface RoomGroupView {
  floor?: string;
  rows: RoomRow[];
}

/** A room moved one place towards the top or the bottom of the list. */
export interface RoomMove {
  roomId: string;
  offset: number;
}

/** The geometry inputs of the properties panel, and the item they came from. */
interface ItemFormValues {
  id: string;
  width: string;
  height: string;
  rotation: string;
  round: boolean;
}

/** The table inputs of the properties panel, and the table they came from. */
interface TableFormValues {
  id: string;
  label: string;
  seats: string;
  shape: TableShape | '';
  enabled: boolean;
}

/** One palette entry, drawn to scale against every other entry. */
interface PaletteView {
  variant: string;
  labelKey: string;
  caption: string;
  round: boolean;
  x: Millimetres;
  y: Millimetres;
  width: Millimetres;
  height: Millimetres;
  centre: Millimetres;
  radius: Millimetres;
}

/**
 * The floor-plan editor: the rooms of one restaurant, the canvas one of them is
 * drawn on (GitHub issue #1082), and the objects standing in it
 * (GitHub issue #1083).
 *
 * There is no create *form* for a room. Adding one writes it straight away at
 * {@link DEFAULT_ROOM_WIDTH_MM} by {@link DEFAULT_ROOM_HEIGHT_MM} and opens it,
 * so the room form has exactly one job — editing the open room — instead of
 * being two modes that look identical and behave differently.
 *
 * Metres in, millimetres out. Every dimension in this component's inputs is
 * metres, because that is what an owner knows about their room and their
 * furniture; the conversion happens on the way out and nowhere else. Rotation
 * is the exception and is typed in degrees, because a degree is what a protractor
 * and the model both use.
 *
 * ## Why the palette places two ways
 *
 * Dragging an entry on to the plan is the fast path and it needs a pointer.
 * Activating the entry places the same object in the middle of the current
 * view, which is the path a keyboard has — and the acceptance criterion that
 * every mutation is reachable without a pointing device is what makes it a
 * requirement rather than a convenience.
 */
@Component({
  selector: 'bt-business-floor-plan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageComponent,
    FloorPlanCanvasComponent,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonItemDivider,
    IonLabel,
    IonNote,
    IonList,
    IonInput,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonSpinner,
    IonToggle,
    TranslocoPipe,
  ],
  templateUrl: './floor-plan.component.html',
  styleUrl: './floor-plan.component.scss',
})
export class FloorPlanComponent {
  private readonly alertController = inject(AlertController);
  private readonly transloco = inject(TranslocoService);

  private readonly canvas = viewChild(FloorPlanCanvasComponent);

  readonly rooms = input<Room[]>([]);
  readonly selectedRoom = input<Room | undefined>(undefined);
  readonly restaurantName = input('');
  readonly loading = input(false);

  /**
   * True once the room read has failed.
   *
   * A separate input rather than an empty list, because the two mean opposite
   * things to the owner: "you have no rooms yet" invites them to make one,
   * while a failed read means the plan they already built is not on screen.
   * Conflating them is what left the Bite details page loading forever in
   * issue #1232.
   */
  readonly loadFailed = input(false);
  readonly saving = input(false);
  readonly isAuthenticated = input(false);
  readonly gridSpacing = input<Millimetres>(0);
  readonly snapEnabled = input(true);
  readonly snapSpacing = input<Millimetres>(0);

  readonly items = input<readonly FloorPlanItem[]>([]);
  readonly selectedIds = input<readonly string[]>([]);
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly unsavedChanges = input(false);

  /**
   * The one selected table, as the entity rather than as a drawn item
   * (GitHub issue #1084).
   *
   * A `RestaurantTable` and not a `FloorPlanItem`, because these fields *are*
   * the table: a capacity and a service state are not geometry and deliberately
   * never reach the canvas's item on the way to being edited.
   */
  readonly selectedTable = input<RestaurantTable | undefined>(undefined);

  /** How many of the selected items are tables, for the numbering helper. */
  readonly selectedTableCount = input(0);

  /** A label the editor refused, until the owner types one it accepts. */
  readonly labelConflict = input<TableLabelConflict | undefined>(undefined);

  /** The room already holding the refused label, so the message can name it. */
  readonly labelConflictRoom = input<string | undefined>(undefined);

  /**
   * Table count and seating per room, keyed by room id
   * (GitHub issue #1085).
   *
   * Beside the room's name rather than inside the room, because the question it
   * answers - how many people does the terrace seat - is asked while looking at
   * the dining room.
   */
  readonly roomCapacities = input<Record<string, RoomCapacity>>({});

  /** The same numbers across every room of the restaurant. */
  readonly restaurantCapacity = input<RestaurantCapacity | undefined>(
    undefined,
  );

  readonly selectRoom = output<string>();
  readonly createRoom = output<RoomDraft>();
  readonly saveRoom = output<RoomDraft>();
  readonly deleteRoom = output<Room>();
  readonly moveRoom = output<RoomMove>();
  readonly gridSpacingChange = output<Millimetres>();
  readonly snapChange = output<boolean>();
  readonly logoutClick = output<void>();

  /** Leaves the editor for the printable table codes (issue #1087). */
  readonly printQrCodes = output<void>();

  readonly placeRequest = output<FloorPlanPlacement>();
  readonly selectionChange = output<string[]>();
  readonly itemsChange = output<FloorPlanItem[]>();
  readonly commandRequest = output<FloorPlanCanvasCommand>();
  readonly resizeSelected = output<FloorPlanSize>();
  readonly rotateSelected = output<number>();

  readonly renameTable = output<string>();
  readonly tableSeatsChange = output<number>();
  readonly tableShapeChange = output<TableShape>();
  readonly tableEnabledChange = output<boolean>();
  readonly numberTables = output<number>();

  /** The room the selected table should stand in from now on. */
  readonly moveTable = output<string>();

  readonly minSeats = MIN_TABLE_SEATS;
  readonly maxSeats = MAX_TABLE_SEATS;

  readonly gridSpacings = GRID_SPACINGS;

  readonly paletteExtent = PALETTE_PREVIEW_EXTENT;

  /**
   * The palette, every entry drawn at the same scale as every other.
   *
   * One `viewBox` across the whole palette rather than one per entry, so a
   * chair looks like a chair beside a three-metre bar. Scaled per entry, the
   * two came out the same width, which is the one impression a to-scale editor
   * must not give before the owner has placed anything.
   */
  readonly palette = computed<PaletteView[]>(() =>
    FLOOR_PLAN_PALETTE.map((entry) => this.paletteView(entry)),
  );

  /**
   * The form's starting values, refilled when the room's identity or version
   * moves and not on every new `Room` object.
   *
   * The version is in the comparison because that is what makes a lost race
   * visible. A save rejected by issue #1081's version rule replaces the open
   * room with the room *as stored*, and a form that kept the owner's text would
   * leave them looking at their own rejected edit while the canvas and the
   * toast said something else. Refilling shows them what is there, which is the
   * whole point of carrying the stored room on the error.
   *
   * Nothing is lost by refilling after a successful save either: the room that
   * comes back is what the form just sent, and the save button is disabled
   * while a write is in flight, so there is no second edit queued behind it.
   *
   * The three drafts below read their value out of this source and never off
   * `selectedRoom` directly — a `linkedSignal` tracks every signal its
   * computation reads, so reaching past the source would refill the form on
   * every unrelated object change.
   */
  private readonly formValues = computed<RoomFormValues>(
    () => {
      const room = this.selectedRoom();

      return {
        id: room?.id ?? '',
        version: room?.version ?? 0,
        name: room?.name ?? '',
        floor: room?.floor ?? '',
        width: this.metresField(room?.size.width),
        height: this.metresField(room?.size.height),
      };
    },
    {
      equal: (before, after) =>
        before.id === after.id && before.version === after.version,
    },
  );

  readonly name = linkedSignal<RoomFormValues, string>({
    source: this.formValues,
    computation: (values) => values.name,
  });

  /**
   * The level the open room sits on, as typed.
   *
   * Free text rather than a picker over the levels already in use: the second
   * room of a restaurant has no list to pick from, and a picker that had to
   * offer "a new one" as an option would be a text field with a step in front
   * of it.
   */
  readonly floor = linkedSignal<RoomFormValues, string>({
    source: this.formValues,
    computation: (values) => values.floor,
  });

  readonly width = linkedSignal<RoomFormValues, string>({
    source: this.formValues,
    computation: (values) => values.width,
  });

  readonly height = linkedSignal<RoomFormValues, string>({
    source: this.formValues,
    computation: (values) => values.height,
  });

  /** The one item the properties panel edits, or nothing. */
  readonly selectedItem = computed<FloorPlanItem | undefined>(() => {
    const ids = this.selectedIds();

    return ids.length === 1
      ? this.items().find((item) => item.id === ids[0])
      : undefined;
  });

  readonly selectionCount = computed(() => this.selectedIds().length);

  /**
   * The properties inputs, refilled whenever the selected item's geometry moves.
   *
   * Everything is in the source, including the geometry itself, so a drag on
   * the canvas updates the numbers the owner is looking at. That is the
   * opposite decision from the room form above, and for the opposite reason:
   * the room form must not be overwritten while it is being typed into, while
   * these fields are a readout of a shape the owner is dragging.
   */
  private readonly itemValues = computed<ItemFormValues>(() => {
    const item = this.selectedItem();

    return {
      id: item?.id ?? '',
      width: this.metresField(item?.size.width),
      height: this.metresField(item?.size.height),
      rotation: item ? String(item.rotation) : '',
      round: item?.round ?? false,
    };
  });

  readonly itemWidth = linkedSignal<ItemFormValues, string>({
    source: this.itemValues,
    computation: (values) => values.width,
  });

  readonly itemHeight = linkedSignal<ItemFormValues, string>({
    source: this.itemValues,
    computation: (values) => values.height,
  });

  readonly itemRotation = linkedSignal<ItemFormValues, string>({
    source: this.itemValues,
    computation: (values) => values.rotation,
  });

  /**
   * The table inputs, refilled whenever the selected table's own fields move.
   *
   * The same decision as the geometry inputs above: everything is in the
   * source, so bulk numbering and an undo both show up in the label field the
   * owner is looking at. A refused label is the one thing that does *not*
   * refill it — the editor kept the old label, and overwriting what the owner
   * typed would hide the very text the conflict message is about.
   */
  private readonly tableValues = computed<TableFormValues>(() => {
    const table = this.selectedTable();

    return {
      id: table?.id ?? '',
      label: table?.label ?? '',
      seats: table ? String(table.seats) : '',
      shape: table?.shape ?? '',
      enabled: table?.enabled ?? true,
    };
  });

  readonly tableLabel = linkedSignal<TableFormValues, string>({
    source: this.tableValues,
    computation: (values) => values.label,
  });

  readonly tableSeats = linkedSignal<TableFormValues, string>({
    source: this.tableValues,
    computation: (values) => values.seats,
  });

  /**
   * The first number a bulk renumber assigns.
   *
   * Plain component state rather than a linked signal: it is the owner's
   * intention for the next action, and nothing on the plan is its source.
   */
  readonly numberFrom = signal(String(FIRST_TABLE_NUMBER));

  readonly hasRooms = computed(() => this.rooms().length > 0);

  /**
   * The room switcher: the rooms grouped by level, each with what it holds.
   *
   * Built here rather than in the template because the two facts a row needs -
   * its capacity, and whether it can still move up or down - are about the room
   * list as a whole, and a template computing them from `$index` inside a group
   * would be computing them from the wrong list.
   */
  readonly roomGroups = computed<RoomGroupView[]>(() => {
    const rooms = this.rooms();
    const capacities = this.roomCapacities();
    const last = rooms.length - 1;

    return floorGroups(rooms).map((group) => ({
      floor: group.floor,
      rows: group.rooms.map((room) => {
        const index = rooms.indexOf(room);

        return {
          room,
          capacity: capacities[room.id] ?? EMPTY_CAPACITY,
          first: index === 0,
          last: index === last,
        };
      }),
    }));
  });

  /**
   * Whether the switcher shows level headings at all.
   *
   * Only once a room names one. A restaurant on a single floor would otherwise
   * get a heading saying its rooms are on no floor, which is a grouping that
   * groups nothing.
   */
  readonly showFloors = computed(() => hasFloors(this.rooms()));

  /** Whether the room order can be changed right now. */
  readonly canReorder = computed(
    () => this.rooms().length > 1 && !this.saving() && !this.unsavedChanges(),
  );

  /** The rooms the selected table could move to: every room but its own. */
  readonly otherRooms = computed<Room[]>(() => {
    const current = this.selectedRoom()?.id;

    return this.rooms().filter((room) => room.id !== current);
  });

  readonly canSave = computed(
    () =>
      !this.saving() &&
      this.name().trim().length > 0 &&
      this.isValidSide(this.width()) &&
      this.isValidSide(this.height()),
  );

  /** The stored dimensions, so the form's numbers can be checked against them. */
  readonly storedSize = computed(() => {
    const room = this.selectedRoom();

    return room
      ? `${formatMetres(room.size.width)} × ${formatMetres(room.size.height)}`
      : '';
  });

  /**
   * Opens another room, asking first when this one has unsaved changes
   * (GitHub issue #1085).
   *
   * Switching rooms reseeds the editor from the room that was opened, so
   * whatever was arranged and not saved is gone. A restaurant with a terrace
   * and two dining rooms switches often enough that losing an afternoon's
   * arranging to one mis-click is a real outcome, so the owner is asked - and
   * asked only when there is something to lose, because a confirmation that
   * appears every time is one nobody reads.
   */
  onSelectRoom(roomId: string | undefined): void {
    if (!roomId || roomId === this.selectedRoom()?.id) {
      return;
    }

    if (!this.unsavedChanges()) {
      this.selectRoom.emit(roomId);

      return;
    }

    void this.confirmDiscard(() => this.selectRoom.emit(roomId));
  }

  /**
   * Moves a room one place up or down the list.
   *
   * Stops the click reaching the row it sits in, which would otherwise open the
   * room the owner was only reordering.
   *
   * No confirmation, because there is nothing to confirm: reordering writes the
   * rooms whose position changed, and the editor reseeds from a room whose
   * version moved, so the control is closed while the open room has unsaved
   * changes rather than offered with a warning attached. `canReorder` is that
   * rule, and the note beside the list says so.
   */
  onMoveRoom(event: Event, roomId: string, offset: number): void {
    event.stopPropagation();

    if (this.canReorder()) {
      this.moveRoom.emit({ roomId, offset });
    }
  }

  /** Sends the room the owner picked for the selected table. */
  onMoveTable(roomId: string | number | undefined): void {
    if (typeof roomId === 'string' && roomId !== this.selectedRoom()?.id) {
      this.moveTable.emit(roomId);
    }
  }

  /**
   * The alert that stands between an unsaved plan and losing it.
   *
   * The destructive button carries the action rather than the cancel one, so
   * dismissing the alert any other way - the backdrop, the escape key - keeps
   * the changes.
   */
  private async confirmDiscard(proceed: () => void): Promise<void> {
    const alert = await this.alertController.create({
      header: this.transloco.translate('floor-plan-discard-title'),
      message: this.transloco.translate('floor-plan-discard-message'),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('floor-plan-discard-confirm'),
          role: 'destructive',
          handler: (): void => proceed(),
        },
      ],
    });

    await alert.present();
  }

  /**
   * Adds a room with a generated name.
   *
   * Numbered rather than blank, because a select whose entries read `""` cannot
   * be used to pick between them. The owner renames it in the form below.
   */
  onAddRoom(): void {
    this.createRoom.emit({
      name: this.transloco.translate('floor-plan-room-default-name', {
        number: this.rooms().length + 1,
      }),
      width: DEFAULT_ROOM_WIDTH_MM,
      height: DEFAULT_ROOM_HEIGHT_MM,
    });
  }

  onSave(): void {
    if (!this.canSave()) {
      return;
    }

    const floor = this.floor().trim();

    this.saveRoom.emit({
      name: this.name().trim(),
      width: metresToMillimetres(Number(this.width())),
      height: metresToMillimetres(Number(this.height())),
      // A cleared field is no floor rather than an empty one, so the room stops
      // being grouped instead of joining a level with a blank name.
      floor: floor.length > 0 ? floor : undefined,
    });
  }

  onGridSpacingChange(spacing: Millimetres | undefined): void {
    if (spacing) {
      this.gridSpacingChange.emit(spacing);
    }
  }

  onSnapChange(enabled: boolean): void {
    this.snapChange.emit(enabled);
  }

  spacingLabel(spacing: Millimetres): string {
    return formatMetres(spacing);
  }

  /** Hands the dragged palette entry to the canvas's drop handler. */
  onPaletteDragStart(event: DragEvent, variant: string): void {
    event.dataTransfer?.setData(PALETTE_DRAG_TYPE, variant);

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
    }
  }

  /**
   * Places a palette entry in the middle of what the owner is looking at.
   *
   * The canvas's own centre rather than the room's, because an owner zoomed in
   * on the far corner of a hall is placing something in that corner. It falls
   * back to the room's centre only when there is no canvas to ask, which is a
   * test fixture rather than a running editor.
   */
  onPaletteActivate(variant: string): void {
    const room = this.selectedRoom();

    if (!room) {
      return;
    }

    this.placeRequest.emit({
      variant,
      position: this.canvas()?.centre() ?? roomCentre(room.size),
    });
  }

  /** Sends the typed label, refused or not: the editor owns the uniqueness rule. */
  onLabelChange(): void {
    this.renameTable.emit(this.tableLabel());
  }

  onSeatsChange(): void {
    const seats = this.numberField(this.tableSeats());

    if (seats !== undefined) {
      this.tableSeatsChange.emit(seats);
    }
  }

  onShapeChange(shape: string | number | undefined): void {
    if (shape === 'round' || shape === 'rectangle') {
      this.tableShapeChange.emit(shape);
    }
  }

  onEnabledChange(enabled: boolean): void {
    this.tableEnabledChange.emit(enabled);
  }

  onNumberTables(): void {
    this.numberTables.emit(
      this.numberField(this.numberFrom()) ?? FIRST_TABLE_NUMBER,
    );
  }

  onItemSizeChange(): void {
    const item = this.selectedItem();

    if (!item) {
      return;
    }

    const width = this.numberField(this.itemWidth());
    const height = this.numberField(this.itemHeight());

    if (width === undefined || (!item.round && height === undefined)) {
      return;
    }

    this.resizeSelected.emit({
      width: metresToMillimetres(width),
      height: metresToMillimetres(item.round ? width : (height as number)),
    });
  }

  onItemRotationChange(): void {
    const degrees = this.numberField(this.itemRotation());

    if (degrees !== undefined) {
      this.rotateSelected.emit(degrees);
    }
  }

  /**
   * A number typed into a field, or nothing.
   *
   * `Number('')` is `0`, which would turn a cleared width into a zero-width
   * object rather than into "the owner has not finished typing".
   */
  private numberField(value: string): number | undefined {
    const parsed = Number(value);

    return value.trim().length > 0 && Number.isFinite(parsed)
      ? parsed
      : undefined;
  }

  /**
   * Deleting a room is confirmed, and the confirmation names the room.
   *
   * A plan is the shape of a real place and its geometry is not recoverable
   * from anywhere else. The refusal for a room that still holds tables comes
   * from the data-access layer afterwards, because only it can count them.
   */
  async onDelete(): Promise<void> {
    const room = this.selectedRoom();

    if (!room) {
      return;
    }

    const alert = await this.alertController.create({
      header: this.transloco.translate('floor-plan-delete-confirm-title'),
      subHeader: room.name,
      message: this.transloco.translate('floor-plan-delete-confirm-message'),
      buttons: [
        { text: this.transloco.translate('cancel'), role: 'cancel' },
        {
          text: this.transloco.translate('floor-plan-delete-room'),
          role: 'destructive',
          handler: (): void => this.deleteRoom.emit(room),
        },
      ],
    });

    await alert.present();
  }

  private paletteView(entry: FloorPlanPaletteEntry): PaletteView {
    const centre = PALETTE_PREVIEW_EXTENT / 2;

    return {
      variant: entry.variant,
      labelKey: entry.labelKey,
      caption: `${formatMetres(entry.size.width)} × ${formatMetres(entry.size.height)}`,
      round: entry.variant === 'table-round',
      x: centre - entry.size.width / 2,
      y: centre - entry.size.height / 2,
      width: entry.size.width,
      height: entry.size.height,
      centre,
      radius: entry.size.width / 2,
    };
  }

  /** Whether a variant is a table, so the palette can say which are business entities. */
  isTable(variant: string): boolean {
    return isTableVariant(variant as FloorPlanItem['variant']);
  }

  private metresField(millimetres: Millimetres | undefined): string {
    return millimetres === undefined
      ? ''
      : String(millimetresToMetres(millimetres));
  }

  private isValidSide(value: string): boolean {
    const metres = Number(value);

    return (
      value.trim().length > 0 &&
      Number.isFinite(metres) &&
      metres >= MIN_ROOM_SIDE_METRES &&
      metres <= MAX_ROOM_SIDE_METRES
    );
  }
}
