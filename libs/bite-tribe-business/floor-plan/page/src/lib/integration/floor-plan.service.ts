import {
  computed,
  inject,
  Injectable,
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
  snapToGrid,
} from 'bite-tribe-business/floor-plan-ui';
import { FloorPlanSize, Millimetres, Restaurant, Room } from 'model';
import { ToastService } from 'toast';
import { resourceFailed, resourceValue } from 'utils';
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

  readonly gridSpacing = signal<Millimetres>(DEFAULT_GRID_SPACING);

  /**
   * Whether the next edit lands on a grid line.
   *
   * Viewport-adjacent editor state, stored nowhere. Turning it on changes where
   * the *next* value goes and never walks through a plan an owner already
   * arranged, which is why nothing here snaps on load.
   */
  readonly snapEnabled = signal(true);

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
   * Renames and resizes the open room.
   *
   * Geometry and version come from the room as loaded, so a save carries the
   * version it was read at and nothing the form could have invented.
   */
  async saveRoom(draft: RoomDraft): Promise<void> {
    const restaurantId = this.restaurantId();
    const room = this.selectedRoom();

    if (!restaurantId || !room) {
      return;
    }

    this.pending.set(true);

    try {
      const saved = await this.dataAccess.saveRoom(restaurantId, {
        ...room,
        name: draft.name,
        size: this.sizeOf(draft),
      });

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
