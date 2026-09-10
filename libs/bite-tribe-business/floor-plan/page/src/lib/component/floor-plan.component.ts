import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import {
  AlertController,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonToggle,
} from '@ionic/angular/standalone';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  FloorPlanCanvasComponent,
  GRID_SPACINGS,
  formatMetres,
  metresToMillimetres,
  millimetresToMetres,
} from 'bite-tribe-business/floor-plan-ui';
import { PageComponent } from 'common/ui/page';
import { Millimetres, Room } from 'model';
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
  width: string;
  height: string;
}

/**
 * The floor-plan editor: the rooms of one restaurant, and the canvas one of
 * them is drawn on (GitHub issue #1082).
 *
 * There is no create *form*. Adding a room writes one straight away at
 * {@link DEFAULT_ROOM_WIDTH_MM} by {@link DEFAULT_ROOM_HEIGHT_MM} and opens it,
 * so the form below has exactly one job — editing the open room — instead of
 * being two modes that look identical and behave differently.
 *
 * Metres in, millimetres out. Every number in this component's inputs is
 * metres, because that is what an owner knows about their room; the conversion
 * happens on the way into {@link RoomDraft} and nowhere else.
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
    IonLabel,
    IonNote,
    IonInput,
    IonButton,
    IonSelect,
    IonSelectOption,
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

  readonly selectRoom = output<string>();
  readonly createRoom = output<RoomDraft>();
  readonly saveRoom = output<RoomDraft>();
  readonly deleteRoom = output<Room>();
  readonly gridSpacingChange = output<Millimetres>();
  readonly snapChange = output<boolean>();
  readonly logoutClick = output<void>();

  readonly gridSpacings = GRID_SPACINGS;

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

  readonly width = linkedSignal<RoomFormValues, string>({
    source: this.formValues,
    computation: (values) => values.width,
  });

  readonly height = linkedSignal<RoomFormValues, string>({
    source: this.formValues,
    computation: (values) => values.height,
  });

  readonly hasRooms = computed(() => this.rooms().length > 0);

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

  onSelectRoom(roomId: string | undefined): void {
    if (roomId) {
      this.selectRoom.emit(roomId);
    }
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

    this.saveRoom.emit({
      name: this.name().trim(),
      width: metresToMillimetres(Number(this.width())),
      height: metresToMillimetres(Number(this.height())),
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
