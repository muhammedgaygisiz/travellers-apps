import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FloorPlanPoint, Millimetres, Room } from 'model';
import {
  FloorPlanBounds,
  RESIZE_HANDLES,
  ResizeHandle,
  ROTATION_SNAP_DEGREES,
  itemBounds,
  moveItems,
  nudgeStep,
  offsetItems,
  resizeItem,
  roomBounds,
  rotationTowards,
} from './floor-plan-geometry';
import { DEFAULT_GRID_SPACING } from './floor-plan-grid';
import { FloorPlanItem } from './floor-plan-item';
import { formatMetres } from './floor-plan-units';
import {
  CanvasViewport,
  EMPTY_VIEWPORT,
  clampCentre,
  clampZoom,
  millimetresPerPixel,
  roomCentre,
  scaleBarLength,
  viewportFor,
  viewportPointAt,
} from './floor-plan-viewport';

/** How far one zoom step moves. */
const ZOOM_STEP = 1.5;

/** How far one arrow key pans, as a share of the visible width or height. */
const KEYBOARD_PAN_RATIO = 0.1;

/**
 * Inset of the scale reference from the viewport edge, taken per axis as a
 * share of that axis's own extent.
 *
 * Per axis rather than one number for both, because a room is rarely square.
 * Measured off the shorter side, the bar came out 13 device pixels above the
 * bottom of a room taller than it is wide and its label was half off the
 * canvas; measured off the longer side, a 2 m by 30 m room would have pushed
 * the bar most of the way across its own width.
 */
const SCALE_BAR_INSET_RATIO = 0.05;

/**
 * Height of the end ticks and size of the label, as a share of the viewport's
 * *longer* side.
 *
 * The longer side, because `preserveAspectRatio="xMidYMid meet"` fits the whole
 * viewBox into the element: whichever axis is longer is the one that maps to
 * the element's full extent, so a share of it is close to a fixed share of the
 * rendered canvas. Taken from the shorter side instead, the label came out at
 * two thirds of that size on a room taller than it is wide.
 */
const SCALE_BAR_TICK_RATIO = 0.012;
const SCALE_BAR_FONT_RATIO = 0.028;

/**
 * Stroke width of a grid line, as a share of the viewport's longer side.
 *
 * Chosen so it lands near one device pixel at an ordinary canvas size. Any
 * finer and the grid renders as a sub-pixel grey wash rather than as lines.
 */
const HAIRLINE_RATIO = 1 / 500;

/**
 * Size of a resize handle and the label on an item, as a share of the
 * viewport's longer side.
 *
 * The same reasoning as every other measurement drawn on this canvas: a share
 * of the viewBox is what holds a handle at one size on screen across the zoom
 * range, because zooming in halves the viewBox and doubles the pixels each
 * millimetre is drawn with.
 */
const HANDLE_RATIO = 0.022;
const ITEM_LABEL_RATIO = 0.03;

/** How far above the item's top edge the rotate handle stands. */
const ROTATE_HANDLE_GAP_RATIO = 0.05;

/**
 * Ids have to be unique per instance: an SVG `<pattern>` and a `<clipPath>`
 * are referenced by id, and two canvases on one page — Storybook shows
 * several — would otherwise share whichever pair was defined last.
 */
let instanceCount = 0;

/** The editor actions the canvas can ask for but does not own. */
export type FloorPlanCanvasCommand =
  'delete' | 'duplicate' | 'undo' | 'redo' | 'select-all';

/** A palette entry dropped or placed on the plan. */
export interface FloorPlanPlacement {
  variant: string;
  position: FloorPlanPoint;
}

/** The `dataTransfer` type a palette drag carries its entry in. */
export const PALETTE_DRAG_TYPE = 'text/plain';

/**
 * A gesture in flight.
 *
 * `preview` is the selection as it currently stands under the pointer, held
 * here and nowhere else. That is what makes a drag cost one component render
 * instead of a write through the whole plan: the room, the tables and every
 * unselected object are untouched until the pointer is released, and the parent
 * hears about the move exactly once, so one gesture is one history entry.
 */
type CanvasGesture =
  | { kind: 'pan' }
  | {
      kind: 'move';
      primaryId: string;
      origin: FloorPlanPoint;
      neighbours: readonly FloorPlanBounds[];
      preview: FloorPlanItem[];
    }
  | { kind: 'resize'; handle: ResizeHandle; preview: FloorPlanItem[] }
  | { kind: 'rotate'; preview: FloorPlanItem[] };

/** One item, ready to draw. */
interface ItemView {
  id: string;
  classes: string;
  selected: boolean;
  transform: string;
  x: Millimetres;
  y: Millimetres;
  width: Millimetres;
  height: Millimetres;
  cx: Millimetres;
  cy: Millimetres;
  radius: Millimetres;
  round: boolean;
  label: string;
  labelSize: Millimetres;
}

/** A resize handle, ready to draw, in the selected item's rotated frame. */
interface HandleView {
  handle: ResizeHandle;
  x: Millimetres;
  y: Millimetres;
}

/** The handles and outline of the one item a resize or rotation applies to. */
interface SelectionOverlay {
  transform: string;
  x: Millimetres;
  y: Millimetres;
  width: Millimetres;
  height: Millimetres;
  size: Millimetres;
  handles: HandleView[];
  rotateX: Millimetres;
  rotateY: Millimetres;
  rotateAnchorY: Millimetres;
}

/**
 * One room drawn as a plan, the viewport an owner moves over it
 * (GitHub issue #1082), and the objects standing in it (GitHub issue #1083).
 *
 * ## Millimetres, not pixels
 *
 * The SVG `viewBox` *is* the viewport, expressed in room millimetres, so the
 * component draws a plan without ever asking how large it is on screen: the
 * browser scales the whole thing, one stored room renders identically on a
 * laptop and on paper, and there is no device assumption to get wrong. Even the
 * scale reference, the resize handles and the labels are sized as a share of
 * the viewport rather than in pixels, which is what keeps them a constant size
 * on screen at every zoom level.
 *
 * Pixels enter in two places, both of them the same conversion: turning a
 * pointer's travel into a pan, and turning the pointer's position into the
 * millimetre under it, where the browser has already measured the element.
 *
 * ## What it does not do
 *
 * It cannot read or write a room. This library is tagged `type:ui`, and
 * `@nx/enforce-module-boundaries` forbids `type:ui` from importing
 * `type:data-access`, so the canvas is structurally unable to save. It takes
 * items and draws them, and reports back the geometry a gesture produced.
 *
 * That extends to the mutations it cannot express as geometry. Deleting,
 * duplicating, undoing and redoing all change *which* items exist, which is the
 * plan rather than the drawing, so the keyboard raises a
 * {@link FloorPlanCanvasCommand} and the editor decides what it means. Pan,
 * zoom, the grid and the selection are viewport state and change no stored
 * field.
 */
@Component({
  selector: 'bt-business-floor-plan-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonButton, IonIcon, TranslocoPipe],
  templateUrl: './floor-plan-canvas.component.html',
  styleUrl: './floor-plan-canvas.component.scss',
})
export class FloorPlanCanvasComponent {
  private readonly svg =
    viewChild<ElementRef<SVGSVGElement>>('floorPlanCanvas');

  readonly room = input<Room | undefined>(undefined);
  readonly gridSpacing = input<Millimetres>(DEFAULT_GRID_SPACING);
  readonly showGrid = input(true);

  /** The geometry and tables standing in the room, drawn in order. */
  readonly items = input<readonly FloorPlanItem[]>([]);

  readonly selectedIds = input<readonly string[]>([]);

  /**
   * The spacing an edit snaps to, or `0` while snapping is off.
   *
   * Separate from {@link gridSpacing}, which is the grid the owner *sees*. The
   * two are usually the same number and mean different things: one decides what
   * is drawn, the other decides where the next edit lands, and turning snapping
   * off must not take the reference lines away with it.
   */
  readonly snapSpacing = input<Millimetres>(0);

  readonly selectionChange = output<string[]>();

  /** The items a gesture changed, at their final geometry. */
  readonly itemsChange = output<FloorPlanItem[]>();

  readonly placeRequest = output<FloorPlanPlacement>();

  readonly commandRequest = output<FloorPlanCanvasCommand>();

  private readonly instance = ++instanceCount;

  readonly gridPatternId = `floor-plan-grid-${this.instance}`;

  readonly gridPatternUrl = `url(#${this.gridPatternId})`;

  /**
   * The plan is clipped to the viewport, because an SVG does not clip to its
   * own `viewBox`.
   *
   * `preserveAspectRatio="xMidYMid meet"` fits the whole viewBox inside the
   * element and leaves spare room along the other axis, and anything drawn in
   * that spare room still paints. Zoomed in on the middle of a plan, that put
   * the room's left wall on screen metres outside the viewport it was supposed
   * to be off the edge of — and left the scale reference floating in the
   * middle of the drawing instead of in the corner of the visible plan.
   */
  readonly clipPathId = `floor-plan-clip-${this.instance}`;

  readonly clipPathUrl = `url(#${this.clipPathId})`;

  /** One cell of the grid, drawn as its top and left edge. */
  readonly gridPath = computed(() => {
    const spacing = this.gridSpacing();

    return `M ${spacing} 0 L 0 0 0 ${spacing}`;
  });

  /**
   * The viewport resets to the fit whenever the room *identity or size*
   * changes, and not when the room object changes.
   *
   * A save returns a new `Room` at the next version, and resetting on that
   * would throw away the owner's pan every time they renamed the room. A
   * changed width or height is the case where the old viewport is genuinely
   * wrong, so the key carries the size and nothing else.
   */
  private readonly viewportKey = computed(() => {
    const room = this.room();

    return room ? `${room.id}:${room.size.width}x${room.size.height}` : '';
  });

  private readonly zoom = linkedSignal<string, number>({
    source: this.viewportKey,
    computation: () => 1,
  });

  private readonly pannedCentre = linkedSignal<
    string,
    FloorPlanPoint | undefined
  >({
    source: this.viewportKey,
    computation: () => undefined,
  });

  /** Where the last pan gesture started, in client pixels. */
  private panFrom?: { x: number; y: number };

  private readonly gesture = signal<CanvasGesture | undefined>(undefined);

  readonly panning = computed(() => this.gesture()?.kind === 'pan');

  readonly centre = computed<FloorPlanPoint>(() => {
    const room = this.room();

    return (
      this.pannedCentre() ?? (room ? roomCentre(room.size) : { x: 0, y: 0 })
    );
  });

  readonly viewport = computed<CanvasViewport>(() => {
    const room = this.room();

    return room
      ? viewportFor(room.size, this.centre(), this.zoom())
      : EMPTY_VIEWPORT;
  });

  readonly viewBox = computed(() => {
    const { x, y, width, height } = this.viewport();

    return `${x} ${y} ${width} ${height}`;
  });

  /**
   * Stroke width for a grid line, in millimetres.
   *
   * Expressed as a share of the viewport rather than in pixels, which is what
   * makes it zoom-invariant: zooming in halves the viewBox and doubles the
   * pixels each millimetre is drawn with, so a stroke that is a fixed fraction
   * of the viewBox comes out the same width on screen at every zoom level. It
   * also keeps the plan's proportions when it is printed, where there is no
   * pixel to express a width in.
   *
   * `vector-effect="non-scaling-stroke"` is the other way to hold a stroke at
   * one screen width. It is not used here because it would make the line
   * weights depend on the device rather than on the drawing, and because a
   * ratio is a number a spec can assert without rendering anything.
   */
  readonly hairline = computed(() => {
    const viewport = this.viewport();

    return Math.max(viewport.width, viewport.height) * HAIRLINE_RATIO;
  });

  /**
   * The plan as it stands under the pointer: the stored items, with the ones a
   * gesture is moving swapped for their preview.
   *
   * The swap is by id rather than a rebuild of the array, so the unselected
   * objects keep their identity and Angular's `track` leaves their DOM alone
   * for the whole drag.
   */
  readonly drawnItems = computed<readonly FloorPlanItem[]>(() => {
    const preview = this.previewById();

    return preview.size === 0
      ? this.items()
      : this.items().map((item) => preview.get(item.id) ?? item);
  });

  private readonly previewById = computed<ReadonlyMap<string, FloorPlanItem>>(
    () => {
      const gesture = this.gesture();
      const preview = gesture && gesture.kind !== 'pan' ? gesture.preview : [];

      return new Map(preview.map((item) => [item.id, item]));
    },
  );

  private readonly selection = computed(() => new Set(this.selectedIds()));

  readonly itemViews = computed<ItemView[]>(() => {
    const viewport = this.viewport();
    const labelSize =
      Math.max(viewport.width, viewport.height) * ITEM_LABEL_RATIO;
    const selection = this.selection();

    return this.drawnItems().map((item) => {
      const selected = selection.has(item.id);

      return {
        id: item.id,
        classes: `floor-plan-canvas__item floor-plan-canvas__item--${item.variant}${
          selected ? ' floor-plan-canvas__item--selected' : ''
        }`,
        selected,
        transform: `rotate(${item.rotation} ${item.position.x} ${item.position.y})`,
        x: item.position.x - item.size.width / 2,
        y: item.position.y - item.size.height / 2,
        width: item.size.width,
        height: item.size.height,
        cx: item.position.x,
        cy: item.position.y,
        radius: item.size.width / 2,
        round: item.round,
        // Only a table carries a label worth drawing at plan scale; a wall's
        // optional label is a note for the owner, not a sign in the room.
        label: item.kind === 'table' ? (item.label ?? '') : '',
        labelSize,
      };
    });
  });

  /**
   * The one item handles are drawn on, or nothing.
   *
   * Resize and rotation are single-item gestures. Eight handles per item across
   * a twenty-table selection is unreadable, and resizing a group needs a rule
   * for what happens to the spacing between its members that no owner has asked
   * for yet.
   */
  private readonly handledItem = computed<FloorPlanItem | undefined>(() => {
    const ids = this.selectedIds();

    return ids.length === 1
      ? this.drawnItems().find((item) => item.id === ids[0])
      : undefined;
  });

  readonly selectionOverlay = computed<SelectionOverlay | undefined>(() => {
    const item = this.handledItem();

    if (!item) {
      return undefined;
    }

    const viewport = this.viewport();
    const size = Math.max(viewport.width, viewport.height) * HANDLE_RATIO;
    const gap =
      Math.max(viewport.width, viewport.height) * ROTATE_HANDLE_GAP_RATIO;
    const left = item.position.x - item.size.width / 2;
    const top = item.position.y - item.size.height / 2;
    const centreX = item.position.x;
    const centreY = item.position.y;
    const right = left + item.size.width;
    const bottom = top + item.size.height;

    const at: Record<ResizeHandle, FloorPlanPoint> = {
      nw: { x: left, y: top },
      n: { x: centreX, y: top },
      ne: { x: right, y: top },
      e: { x: right, y: centreY },
      se: { x: right, y: bottom },
      s: { x: centreX, y: bottom },
      sw: { x: left, y: bottom },
      w: { x: left, y: centreY },
    };

    return {
      transform: `rotate(${item.rotation} ${item.position.x} ${item.position.y})`,
      x: left,
      y: top,
      width: item.size.width,
      height: item.size.height,
      size,
      handles: RESIZE_HANDLES.map((handle) => ({
        handle,
        x: at[handle].x - size / 2,
        y: at[handle].y - size / 2,
      })),
      rotateX: centreX,
      rotateY: top - gap,
      rotateAnchorY: top,
    };
  });

  readonly scaleBar = computed(() => {
    const viewport = this.viewport();
    const length = scaleBarLength(viewport.width);
    const longSide = Math.max(viewport.width, viewport.height);
    const tick = longSide * SCALE_BAR_TICK_RATIO;
    const x = viewport.x + viewport.width * SCALE_BAR_INSET_RATIO;
    const y = viewport.y + viewport.height * (1 - SCALE_BAR_INSET_RATIO);

    const end = x + length;
    const fontSize = longSide * SCALE_BAR_FONT_RATIO;

    return {
      x,
      y,
      end,
      tick,
      fontSize,
      /*
       * The label sits beside the bar rather than above it. Above, it landed
       * on the room's bottom wall - the bar is drawn in the margin under the
       * plan, and a label a font-size higher is back inside the room.
       */
      labelX: end + tick,
      labelY: y + fontSize * 0.35,
      caption: formatMetres(length),
    };
  });

  zoomIn(): void {
    this.zoom.update((zoom) => clampZoom(zoom * ZOOM_STEP));
  }

  zoomOut(): void {
    this.zoom.update((zoom) => clampZoom(zoom / ZOOM_STEP));
  }

  zoomToFit(): void {
    this.zoom.set(1);
    this.pannedCentre.set(undefined);
  }

  onWheel(event: WheelEvent): void {
    if (!this.room()) {
      return;
    }

    // Without this the page behind the canvas scrolls instead, which on a
    // trackpad makes the plan impossible to zoom at all.
    event.preventDefault();

    if (event.deltaY < 0) {
      this.zoomIn();
    } else if (event.deltaY > 0) {
      this.zoomOut();
    }
  }

  /**
   * Where a pointer went down decides what the gesture is.
   *
   * A handle resizes or rotates, an item moves it, and bare floor pans and
   * clears the selection. Read off the event's target rather than bound per
   * element, because SVG events bubble to the root and one router here beats a
   * handler on every rect the plan contains.
   */
  onPointerDown(event: PointerEvent): void {
    const element = this.svg()?.nativeElement;

    if (!element || !this.room()) {
      return;
    }

    // Captured so a gesture that leaves the canvas keeps going, rather than
    // stopping at the edge and leaving the plan half-moved.
    element.setPointerCapture?.(event.pointerId);

    const target = event.target instanceof Element ? event.target : undefined;
    const handle = target
      ?.closest('[data-handle]')
      ?.getAttribute('data-handle');

    if (handle) {
      this.startHandleGesture(handle);

      return;
    }

    const itemId = target
      ?.closest('[data-item-id]')
      ?.getAttribute('data-item-id');

    if (itemId) {
      this.startMove(itemId, event);

      return;
    }

    this.selectionChange.emit([]);
    this.panFrom = { x: event.clientX, y: event.clientY };
    this.gesture.set({ kind: 'pan' });
  }

  onPointerMove(event: PointerEvent): void {
    const gesture = this.gesture();

    if (!gesture) {
      return;
    }

    if (gesture.kind === 'pan') {
      this.panWith(event);

      return;
    }

    const pointer = this.roomPointAt(event);

    if (!pointer) {
      return;
    }

    if (gesture.kind === 'move') {
      this.previewMove(gesture, pointer);
    } else if (gesture.kind === 'resize') {
      this.previewResize(gesture.handle, pointer, event.shiftKey);
    } else {
      this.previewRotation(pointer, event.shiftKey);
    }
  }

  /**
   * Ends a gesture and reports what it produced.
   *
   * Capture is not released here: the Pointer Events spec releases it
   * implicitly on `pointerup` and `pointercancel`, and calling
   * `releasePointerCapture` for a pointer that is no longer captured throws.
   */
  onPointerUp(): void {
    const gesture = this.gesture();

    this.panFrom = undefined;
    this.gesture.set(undefined);

    if (gesture && gesture.kind !== 'pan' && this.hasMoved(gesture.preview)) {
      this.itemsChange.emit(gesture.preview);
    }
  }

  /**
   * Whether a gesture actually changed anything.
   *
   * A click on a table is a `move` gesture that never moved: the pointer went
   * down and came up on the same millimetre. Emitting it would put an entry on
   * the undo stack for selecting something, and an owner pressing undo would
   * then watch nothing happen twenty times.
   */
  private hasMoved(preview: readonly FloorPlanItem[]): boolean {
    const stored = new Map(this.items().map((item) => [item.id, item]));

    return preview.some((item) => {
      const before = stored.get(item.id);

      return (
        !before ||
        before.position.x !== item.position.x ||
        before.position.y !== item.position.y ||
        before.size.width !== item.size.width ||
        before.size.height !== item.size.height ||
        before.rotation !== item.rotation
      );
    });
  }

  /**
   * A palette entry dragged over the plan.
   *
   * The default action of a `dragover` is to refuse the drop, so preventing it
   * is what makes the canvas a drop target at all.
   */
  onDragOver(event: DragEvent): void {
    if (!this.room()) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    if (!this.room()) {
      return;
    }

    /*
     * Prevented before the payload is read, and whatever the payload turns out
     * to be. `onDragOver` has already made this a drop target, so leaving the
     * default in place hands whatever was dropped to the browser — which for a
     * dragged link or file means navigating away from the editor.
     */
    event.preventDefault();

    const variant = event.dataTransfer?.getData(PALETTE_DRAG_TYPE);
    const position = this.roomPointAt(event);

    if (variant && position) {
      this.placeRequest.emit({ variant, position });
    }
  }

  /**
   * Arrow keys nudge the selection or pan the plan, `+` and `-` zoom, `0` fits.
   *
   * A canvas that can only be moved by dragging cannot be moved without a
   * pointer, and an owner reviewing a plan on a laptop keyboard is the ordinary
   * case rather than an accessibility afterthought. The same reasoning is what
   * puts every mutation on this switch: place, move, resize and rotate all have
   * a keyboard path, so the arrow keys mean the selection whenever there is
   * one and the viewport only when there is not.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.handleCommandKey(event) || this.handleSelectionKey(event)) {
      event.preventDefault();

      return;
    }

    const viewport = this.viewport();
    const stepX = viewport.width * KEYBOARD_PAN_RATIO;
    const stepY = viewport.height * KEYBOARD_PAN_RATIO;

    switch (event.key) {
      case 'ArrowLeft':
        this.panBy(-stepX, 0);
        break;
      case 'ArrowRight':
        this.panBy(stepX, 0);
        break;
      case 'ArrowUp':
        this.panBy(0, -stepY);
        break;
      case 'ArrowDown':
        this.panBy(0, stepY);
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case '0':
        this.zoomToFit();
        break;
      default:
        return;
    }

    event.preventDefault();
  }

  /** The editor commands, which change which items exist rather than where. */
  private handleCommandKey(event: KeyboardEvent): boolean {
    const modified = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();

    if (modified && key === 'a') {
      this.commandRequest.emit('select-all');

      return true;
    }

    if (modified && key === 'z') {
      this.commandRequest.emit(event.shiftKey ? 'redo' : 'undo');

      return true;
    }

    if (modified && key === 'y') {
      this.commandRequest.emit('redo');

      return true;
    }

    if (modified && key === 'd' && this.selectedIds().length > 0) {
      this.commandRequest.emit('duplicate');

      return true;
    }

    return false;
  }

  /** What the plain keys mean while something is selected. */
  private handleSelectionKey(event: KeyboardEvent): boolean {
    if (event.key === 'Escape') {
      // A gesture in flight is abandoned without emitting, so the plan is left
      // exactly as it was before the pointer went down.
      if (this.gesture()) {
        this.panFrom = undefined;
        this.gesture.set(undefined);
      } else {
        this.selectionChange.emit([]);
      }

      return true;
    }

    const selected = this.selectedItems();

    if (selected.length === 0) {
      return false;
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
      this.commandRequest.emit('delete');

      return true;
    }

    const step = nudgeStep(this.snapSpacing(), event.shiftKey);
    const delta = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    }[event.key];

    const room = this.room();

    if (!delta || !room) {
      return false;
    }

    this.itemsChange.emit(offsetItems(selected, delta, room.size));

    return true;
  }

  private selectedItems(): FloorPlanItem[] {
    const selection = this.selection();

    return this.items().filter((item) => selection.has(item.id));
  }

  /**
   * Which items a pointer-down on one of them leaves selected.
   *
   * Shift or the platform modifier adds to the selection. Otherwise pressing on
   * an item that is already part of a selection keeps that selection, so a
   * group can be dragged by any of its members; pressing on anything else
   * replaces it.
   */
  private startMove(itemId: string, event: PointerEvent): void {
    const room = this.room();
    const origin = this.roomPointAt(event);

    if (!room || !origin) {
      return;
    }

    const current = this.selectedIds();
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;

    const next = additive
      ? current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
      : current.includes(itemId)
        ? [...current]
        : [itemId];

    this.selectionChange.emit(next);

    const moving = this.items().filter((item) => next.includes(item.id));

    if (moving.length === 0) {
      return;
    }

    this.gesture.set({
      kind: 'move',
      primaryId: itemId,
      origin,
      neighbours: [
        roomBounds(room.size),
        ...this.items()
          .filter((item) => !next.includes(item.id))
          .map(itemBounds),
      ],
      preview: moving,
    });
  }

  private startHandleGesture(handle: string): void {
    const item = this.handledItem();

    if (!item) {
      return;
    }

    this.gesture.set(
      handle === 'rotate'
        ? { kind: 'rotate', preview: [item] }
        : { kind: 'resize', handle: handle as ResizeHandle, preview: [item] },
    );
  }

  private previewMove(
    gesture: Extract<CanvasGesture, { kind: 'move' }>,
    pointer: FloorPlanPoint,
  ): void {
    const room = this.room();

    if (!room) {
      return;
    }

    const moving = this.items().filter((item) =>
      gesture.preview.some((candidate) => candidate.id === item.id),
    );

    this.gesture.set({
      ...gesture,
      preview: moveItems(
        moving,
        gesture.primaryId,
        {
          x: pointer.x - gesture.origin.x,
          y: pointer.y - gesture.origin.y,
        },
        {
          room: room.size,
          spacing: this.snapSpacing(),
          neighbours: gesture.neighbours,
        },
      ),
    });
  }

  private previewResize(
    handle: ResizeHandle,
    pointer: FloorPlanPoint,
    fine: boolean,
  ): void {
    const room = this.room();
    const ids = this.selectedIds();
    const stored = this.items().find((item) => item.id === ids[0]);

    if (!room || !stored) {
      return;
    }

    this.gesture.set({
      kind: 'resize',
      handle,
      // Shift resizes off the grid, for the object whose real size is not a
      // round number: a 1.4 m banquette in a room laid out on the half-metre.
      preview: [
        resizeItem(stored, handle, pointer, {
          room: room.size,
          spacing: fine ? 0 : this.snapSpacing(),
        }),
      ],
    });
  }

  private previewRotation(pointer: FloorPlanPoint, snap: boolean): void {
    const ids = this.selectedIds();
    const stored = this.items().find((item) => item.id === ids[0]);

    if (!stored) {
      return;
    }

    this.gesture.set({
      kind: 'rotate',
      preview: [
        {
          ...stored,
          rotation: rotationTowards(
            stored.position,
            pointer,
            snap ? ROTATION_SNAP_DEGREES : 0,
          ),
        },
      ],
    });
  }

  private panWith(event: PointerEvent): void {
    const room = this.room();
    const element = this.svg()?.nativeElement;

    if (!this.panFrom || !room || !element) {
      return;
    }

    const perPixel = millimetresPerPixel(
      this.viewport(),
      element.getBoundingClientRect(),
    );

    if (perPixel === undefined) {
      return;
    }

    const deltaX = (event.clientX - this.panFrom.x) * perPixel;
    const deltaY = (event.clientY - this.panFrom.y) * perPixel;

    this.panFrom = { x: event.clientX, y: event.clientY };
    this.panBy(-deltaX, -deltaY);
  }

  private roomPointAt(event: {
    clientX: number;
    clientY: number;
  }): FloorPlanPoint | undefined {
    const element = this.svg()?.nativeElement;

    return element
      ? viewportPointAt(this.viewport(), element.getBoundingClientRect(), event)
      : undefined;
  }

  private panBy(x: Millimetres, y: Millimetres): void {
    const room = this.room();

    if (!room) {
      return;
    }

    const centre = this.centre();

    this.pannedCentre.set(
      clampCentre({ x: centre.x + x, y: centre.y + y }, room.size),
    );
  }
}
