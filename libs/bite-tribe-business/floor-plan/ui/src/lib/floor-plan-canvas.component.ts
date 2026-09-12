import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FloorPlanPoint, Millimetres, Room, TableStatus } from 'model';
import {
  FloorPlanBounds,
  RESIZE_HANDLES,
  ResizeHandle,
  ROTATION_SNAP_DEGREES,
  itemBounds,
  isWithinViewport,
  moveItems,
  nudgeStep,
  offsetItems,
  resizeItem,
  roomBounds,
  rotationTowards,
} from './floor-plan-geometry';
import { DEFAULT_GRID_SPACING } from './floor-plan-grid';
import { FloorPlanItem } from './floor-plan-item';
import { paletteEntry } from './floor-plan-palette';
import {
  STATUS_TINT_ALPHA,
  tableStatusGlyphPath,
  tableStatusMark,
  withAlpha,
} from './table-status-marks';
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

/**
 * The seat count, as a share of the table's number (GitHub issue #1084).
 *
 * Smaller, because the two are not equals: a staff member scanning the plan is
 * looking for a number, and a capacity that competed with it for the same
 * glance would make neither readable. Large enough to survive zoom-to-fit,
 * which is the zoom level the acceptance criterion names.
 */
const SEATS_LABEL_RATIO = 0.62;

/**
 * How far the number and the seat count sit either side of the table's centre.
 *
 * As a share of the label's own size, so the pair stays a pair at every zoom
 * level rather than drifting apart as the viewBox shrinks.
 */
const LABEL_STACK_RATIO = 0.5;

/**
 * The seated figure drawn beside the capacity, sized against the digits.
 *
 * A pictograph rather than the word, because a 900 mm round table is about
 * three characters wide at zoom-to-fit and "4 seats" written across one runs
 * off both sides. It is also what stops two numbers on one table being
 * ambiguous: the large one in the middle is what staff call the table, and the
 * small one behind a figure is how many people fit. The words are still there,
 * in the `<title>`, where a hover and a screen reader both find them.
 *
 * A head and a pair of shoulders in two primitives, so it survives the
 * greyscale of a printed QR sheet the way the rest of this drawing does.
 */
const SEAT_GLYPH_WIDTH_RATIO = 0.5;
const SEAT_GLYPH_GAP_RATIO = 0.18;
const SEAT_HEAD_RADIUS_RATIO = 0.16;
const SEAT_HEAD_OFFSET_RATIO = 0.2;
const SEAT_SHOULDER_TOP_RATIO = 0.06;
const SEAT_SHOULDER_BOTTOM_RATIO = 0.36;

/** Roughly how wide one digit is in the sans-serif face the plan is drawn in. */
const DIGIT_WIDTH_RATIO = 0.62;

/**
 * Roughly how wide one character of a word is in that face.
 *
 * Wider than a digit, because a status word is mixed case with ascenders and
 * descenders rather than tabular figures. It is an estimate rather than a
 * measurement, because measuring text means rendering it first and this runs
 * while the viewport is being computed - so it errs slightly wide, which shrinks
 * a word a little more than it strictly needed rather than letting it run off
 * the table.
 */
const CHARACTER_WIDTH_RATIO = 0.58;

/**
 * How much of a table's width an annotation may take (GitHub issue #1093).
 *
 * A rectangle offers nearly all of it; a circle offers a chord rather than its
 * diameter at any row above or below the centre, so a word that fitted across
 * the middle of a round table would still leave the shape at the row the status
 * is drawn on.
 *
 * The status word and the time in state are both shrunk to fit this. Without
 * it, `Occupied` and `1 h 12 min` are simply wider than a 1000 mm table at
 * zoom-to-fit, and a room of occupied tables becomes one long smear of
 * overlapping words - which is what the first render of this looked like.
 */
const RECTANGLE_TEXT_FIT = 0.92;
const ROUND_TEXT_FIT = 0.78;

/**
 * The status silhouette, as a share of the table's number
 * (GitHub issue #1093).
 *
 * Smaller than the number, because the number is what a staff member calls out
 * and everything else on the table is an annotation on it. Large enough that a
 * filled circle and a hollow square are still different shapes at the size a
 * whole room is drawn at, which is the size the mark has to work at.
 */
const STATUS_GLYPH_RATIO = 0.7;

/**
 * Where the three rows of a table under service sit, as shares of the stack
 * step.
 *
 * A table with a live status carries a row above the number and a row below it,
 * where the editor's table carries only the row below. The number stays nearly
 * centred, because it is still the thing the table is identified by; the two
 * annotations are pushed out either side of it far enough that no glyph touches
 * a digit at any zoom level.
 */
const STATUS_ROW_OFFSET = 1.9;
const STATUS_NUMBER_OFFSET = 0.1;
const STATUS_FOOT_OFFSET = 1.5;

/**
 * How far a press may travel and still count as a tap, in CSS pixels.
 *
 * A finger on glass never holds still, so a tap on a table with no tolerance at
 * all would be a one-pixel pan that selected nothing. Small enough that a
 * deliberate drag to pan the plan is never mistaken for a tap on whatever it
 * started over.
 */
const TAP_SLOP_PIXELS = 8;

/** How long a finger rests on a table before it counts as a long press. */
const LONG_PRESS_MS = 500;

/** How far above the item's top edge the rotate handle stands. */
const ROTATE_HANDLE_GAP_RATIO = 0.05;

/**
 * How many hairlines an item is drawn with, and a selected one (issue #1089).
 *
 * Selection was a hue and nothing else: the same stroke in the primary colour.
 * Printed, photocopied or read by an owner who does not separate blue from
 * grey, that is no distinction at all, and the dashed outline that would have
 * carried it is drawn only around a *single* selected item - so a selected
 * group said nothing. A heavier line says it in the vocabulary the rest of this
 * drawing already uses, and says it in greyscale.
 */
const ITEM_HAIRLINES = 2;
const SELECTED_HAIRLINES = 4;

/**
 * How wide an annotation drawn on one item may be, in millimetres.
 *
 * A circle is measured against a chord rather than its diameter, because the
 * status row and the duration row are drawn above and below the centre where
 * the shape is already narrowing.
 */
const textRoom = (item: FloorPlanItem): Millimetres =>
  item.size.width * (item.round ? ROUND_TEXT_FIT : RECTANGLE_TEXT_FIT);

/**
 * How much a run of text has to shrink to fit the room it is given, never
 * growing it past its natural size.
 */
const fitScale = (natural: Millimetres, available: Millimetres): number =>
  natural > 0 ? Math.min(1, available / natural) : 1;

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
      /**
       * Two fingers on the plan (GitHub issue #1093).
       *
       * A gesture of its own rather than two pans, because what the second
       * finger changes is the *scale*, and a pan that kept running beside it
       * would fight the zoom for the same viewport. Whatever single-pointer
       * gesture was in flight is abandoned when the second pointer lands, so
       * a pinch started with a finger already resting on a table cannot leave
       * the table somewhere new.
       */
      kind: 'pinch';
      /** How far apart the two fingers were on the last frame, in pixels. */
      spread: number;
      /** Where their midpoint was on the last frame, in client pixels. */
      centre: { x: number; y: number };
    }
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
  /**
   * The element's own id, so `aria-activedescendant` can point at it.
   *
   * Carries the canvas instance as well as the item, because two canvases on
   * one page - Storybook shows several - draw the same plan and would
   * otherwise give two elements one id.
   */
  domId: string;
  classes: string;
  /** The copy key naming what the item is, which is the palette's own. */
  typeKey: string;
  /** The copy key the accessible name is built from. */
  nameKey: string;
  selected: boolean;
  /** Stroke width in millimetres, heavier while the item is selected. */
  strokeWidth: Millimetres;
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
  labelY: Millimetres;
  /** Seating capacity, on a table that has one, drawn under the number. */
  seats?: number;
  /** The capacity as digits, which is all that fits on a table at plan scale. */
  seatsText: string;
  seatsSize: Millimetres;
  seatsY: Millimetres;
  /** Where the digits start, to the right of the seated figure. */
  seatsTextX: Millimetres;
  seatHeadX: Millimetres;
  seatHeadY: Millimetres;
  seatHeadRadius: Millimetres;
  /** The figure's shoulders, as a filled arc under its head. */
  seatShoulders: string;
  /** The live status row, on a table the live view has one for (issue #1093). */
  status?: StatusView;
  /**
   * How long the table has been in its status, drawn where the seat count is.
   *
   * Empty when there is nothing to say, which is also when the seat count is
   * drawn instead.
   */
  durationText: string;
  /** Shrunk from the seat count's size when the table is too small for it. */
  durationSize: Millimetres;
  /**
   * The status in full, whether or not the drawing had room for the word.
   *
   * Separate from {@link StatusView.text}, which is what is *drawn* and is
   * dropped on a table too small to hold it. A screen reader has no such
   * constraint, and a table whose name stopped saying what it was doing because
   * the table was small would be the accessibility bug this whole row exists to
   * avoid.
   */
  statusName: string;
}

/**
 * One table's live status, ready to draw.
 *
 * A colour and a silhouette, and deliberately no word.
 *
 * The word was drawn here first and had to come out. Everything on this canvas
 * is a share of the `viewBox`, which is what holds it at one size on screen
 * across the zoom range - so a status word is the same handful of pixels
 * however far the plan is zoomed in, and in a 12 m room that is about eight of
 * them. `Occupied` at eight pixels is a smudge, and a rule that drew it only
 * when it fitted the table drew `Free` and `Paying` and not `Occupied` or
 * `Reserved`, which made one room look like two conventions.
 *
 * So the plan says the status in colour and in shape, and the *word* for it is
 * in three places that are all on screen at once: the summary bar above the
 * plan lists every status the room is currently in, the detail panel names the
 * picked table's, and the table's accessible name says it in full. The
 * criterion is that colour is never the sole carrier, and the silhouette is
 * what carries it here - in greyscale, in a print, and for a reader who does
 * not separate blue from grey.
 */
interface StatusView {
  /** The status colour at full strength, for the outline and the glyph. */
  colour: string;
  /** The same colour washed over the table's own fill. */
  tint: string;
  /** The silhouette, as path data in the table's own frame. */
  glyphPath: string;
  /** Painted rather than outlined. */
  glyphFilled: boolean;
  glyphStrokeWidth: Millimetres;
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
 * laptop and on paper, and there is no device assumption to get wrong. The
 * resize handles and the item labels are sized as a share of the viewport
 * rather than in pixels, which is what keeps them a constant size on screen at
 * every zoom level.
 *
 * Pixels enter for the things that are *not* part of the drawing. Two of them
 * are the same conversion - turning a pointer's travel into a pan, and turning
 * the pointer's position into the millimetre under it. The third is the scale
 * reference, which is an overlay pinned to the element rather than a mark on
 * the plan: `preserveAspectRatio="xMidYMid meet"` letterboxes a portrait
 * viewBox inside a landscape element, and that letterbox is not addressable in
 * viewBox coordinates, so a bar placed there has to be measured in pixels. It
 * used to be drawn in millimetres and straddled the room's bottom-left corner
 * with its label on the wall, while the empty letterbox sat beside it.
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

  /**
   * Draws the plan without letting anything move it (GitHub issue #1093).
   *
   * The live view staff open during service is the same drawing as the editor
   * and none of the same gestures: a host reading the room must not be able to
   * shove a table 200 mm because their thumb slid while they were looking for
   * table 6, and the plan they are reading is the *published* one, which this
   * component could not write even if it wanted to. So a press that would start
   * a move starts a pan instead, the resize and rotate handles are not drawn at
   * all, and the keys that delete, duplicate, undo, redo and nudge do nothing.
   *
   * Selection stays, because it is how a table is picked up to act on, and Tab
   * still walks the room for the same reason it does in the editor. Pan, zoom,
   * pinch and the long press stay too: they are how the plan is read rather
   * than how it is changed.
   *
   * A boolean attribute, so the live view writes `readOnly` on the tag the way
   * `disabled` is written rather than binding the literal `true`.
   */
  readonly readOnly = input(false, { transform: booleanAttribute });

  readonly selectionChange = output<string[]>();

  /** The items a gesture changed, at their final geometry. */
  readonly itemsChange = output<FloorPlanItem[]>();

  readonly placeRequest = output<FloorPlanPlacement>();

  readonly commandRequest = output<FloorPlanCanvasCommand>();

  /**
   * One item, held rather than tapped (GitHub issue #1093).
   *
   * The touch equivalent of a right-click, and the gesture staff reach for when
   * they want to *do* something to a table rather than look at it. The canvas
   * only reports it: what a long press opens is the caller's decision, and the
   * actions themselves are issue #1094.
   */
  readonly longPress = output<string>();

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

  /** The element id of one item on this canvas. */
  private itemDomId(id: string): string {
    return `floor-plan-item-${this.instance}-${id}`;
  }

  /**
   * The item a screen reader should read out, or nothing.
   *
   * The canvas is one tab stop and the objects inside it are not focusable -
   * SVG focus is inconsistent across browsers, and twenty tables in the page's
   * tab order would bury every control after them. So focus stays on the
   * drawing and `aria-activedescendant` says which object it is on, which is
   * the same thing the selection already says visually.
   *
   * The last selected item rather than the first, because that is the one the
   * keyboard just walked on to, and the one a shift-click just added.
   */
  readonly activeDescendant = computed<string | null>(() => {
    const ids = this.selectedIds();
    const last = ids[ids.length - 1];

    return this.items().some((item) => item.id === last)
      ? this.itemDomId(last)
      : null;
  });

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

  /**
   * Every pointer currently down on the canvas, in client pixels.
   *
   * Kept so a second finger can be noticed at all: a pointer event says only
   * where *it* is, and a pinch is a fact about two of them. The map is the
   * single source for how many are down, so a finger lifted outside the element
   * is removed by the same path as one lifted on it.
   */
  private readonly pointers = new Map<number, { x: number; y: number }>();

  /**
   * The press in flight: what it started over, and whether it has become
   * something other than a tap (GitHub issue #1093).
   *
   * `travelled` and `longPressed` are both "this is no longer a tap", recorded
   * separately because they end differently: a press that travelled panned the
   * plan and selects nothing, and one that was held already opened the actions
   * and must not then also select on release.
   */
  private press?: {
    itemId?: string;
    from: { x: number; y: number };
    travelled: boolean;
    longPressed: boolean;
  };

  private longPressTimer?: ReturnType<typeof setTimeout>;

  private readonly gesture = signal<CanvasGesture | undefined>(undefined);

  /**
   * The element's own size in CSS pixels, or nothing before it is measured.
   *
   * The plan is still drawn without it. This exists for the two overlays that
   * sit *outside* the viewBox - the zoom buttons and the scale reference - and
   * the scale reference is the only one that needs a number: a millimetre
   * length has to become a pixel width somewhere, and the letterbox it stands
   * in is not addressable in viewBox coordinates at all.
   *
   * Observed rather than read once, so the bar is still right after a window
   * resize instead of only on the render that happened to measure.
   */
  private readonly elementSize = signal<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  constructor() {
    effect((onCleanup) => {
      const element = this.svg()?.nativeElement;

      // Absent in jsdom, where there is no layout to observe either.
      if (!element || typeof ResizeObserver === 'undefined') {
        return;
      }

      const observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;

        this.elementSize.set({ width, height });
      });

      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });
  }

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
      // Pan and pinch move the *view*, so neither previews an item. Listing
      // them rather than testing for `'pan'` alone is what makes a third such
      // gesture a compile error here instead of a crash on the first frame.
      const preview =
        gesture && gesture.kind !== 'pan' && gesture.kind !== 'pinch'
          ? gesture.preview
          : [];

      return new Map(preview.map((item) => [item.id, item]));
    },
  );

  private readonly selection = computed(() => new Set(this.selectedIds()));

  readonly itemViews = computed<ItemView[]>(() => {
    const viewport = this.viewport();
    const hairline = this.hairline();
    const labelSize =
      Math.max(viewport.width, viewport.height) * ITEM_LABEL_RATIO;
    const seatsSize = labelSize * SEATS_LABEL_RATIO;
    const stack = labelSize * LABEL_STACK_RATIO;
    const selection = this.selection();

    return this.drawnItems().map((item) => {
      const selected = selection.has(item.id);
      /*
       * The name an owner would use for this thing, which is the name the
       * palette placed it under. Read from the palette rather than restated
       * here, so a renamed object is renamed everywhere it is spoken about.
       * The fallback is unreachable - the palette covers every variant the
       * union has - and is a real key rather than the raw variant, so a future
       * variant added to one list and not the other says "Objects" instead of
       * reading out `table-round`.
       */
      const typeKey =
        paletteEntry(item.variant)?.labelKey ?? 'floor-plan-objects';
      // Only a table carries a label worth drawing at plan scale; a wall's
      // optional label is a note for the owner, not a sign in the room.
      const isTable = item.kind === 'table';
      // A status pushes the seat count down a row and lifts the number back
      // towards the middle, so the three annotations stack without touching.
      const live = isTable ? item.status : undefined;
      const duration = live === undefined ? undefined : item.statusDuration;
      const seats = isTable ? item.seats : undefined;
      /*
       * The duration takes the seat count's place rather than sharing its row:
       * one small number under a table is readable across a room and two are
       * not, and a table with a party at it is not one a host is sizing up.
       * The capacity is still on {@link ItemView.seats}, and so still in the
       * accessible name - it is the drawing that has no room for it, not the
       * reader.
       */
      const seatsText = seats === undefined || duration ? '' : String(seats);
      const footY = item.position.y + stack * (live ? STATUS_FOOT_OFFSET : 1);
      const seatsY = footY;
      // The figure and the digits are one block, centred on the table together,
      // so a two-digit capacity does not push the pair off to one side.
      const glyphWidth = seatsSize * SEAT_GLYPH_WIDTH_RATIO;
      const gap = seatsSize * SEAT_GLYPH_GAP_RATIO;
      const textWidth = seatsText.length * seatsSize * DIGIT_WIDTH_RATIO;
      const blockLeft = item.position.x - (glyphWidth + gap + textWidth) / 2;
      const shoulderTop = seatsY + seatsSize * SEAT_SHOULDER_TOP_RATIO;
      const shoulderBottom = seatsY + seatsSize * SEAT_SHOULDER_BOTTOM_RATIO;

      return {
        id: item.id,
        domId: this.itemDomId(item.id),
        classes: `floor-plan-canvas__item floor-plan-canvas__item--${item.variant}${
          selected ? ' floor-plan-canvas__item--selected' : ''
        }${item.enabled === false ? ' floor-plan-canvas__item--disabled' : ''}${
          live
            ? ` floor-plan-canvas__item--status floor-plan-canvas__item--status-${live}`
            : ''
        }`,
        typeKey,
        /*
         * Under service the name says what the table is *doing*, because that
         * is what the drawing now says and a screen reader that only read out
         * "table 6, 4 seats" would be describing the editor's plan while the
         * sighted half of the room reads the live one.
         */
        nameKey: !isTable
          ? typeKey
          : live === undefined
            ? item.enabled === false
              ? 'floor-plan-item-table-disabled'
              : 'floor-plan-item-table'
            : duration
              ? 'table-plan-item-table-timed'
              : 'table-plan-item-table',
        selected,
        strokeWidth:
          hairline * (selected ? SELECTED_HAIRLINES : ITEM_HAIRLINES),
        transform: `rotate(${item.rotation} ${item.position.x} ${item.position.y})`,
        x: item.position.x - item.size.width / 2,
        y: item.position.y - item.size.height / 2,
        width: item.size.width,
        height: item.size.height,
        cx: item.position.x,
        cy: item.position.y,
        radius: item.size.width / 2,
        round: item.round,
        label: isTable ? (item.label ?? '') : '',
        labelSize,
        /*
         * Centred when the number stands alone, lifted when a seat count is
         * drawn under it, so a table without a capacity is not off-centre.
         * Under service it goes back towards the middle, because a status row
         * above it balances the row below.
         */
        labelY: live
          ? item.position.y - stack * STATUS_NUMBER_OFFSET
          : seats === undefined
            ? item.position.y
            : item.position.y - stack,
        status:
          live === undefined
            ? undefined
            : this.statusView(item, live, labelSize, stack, hairline),
        statusName: (live === undefined ? '' : item.statusLabel) ?? '',
        durationText: duration ?? '',
        /*
         * Shrunk to the table rather than clipped by it. `1 h 12 min` is wider
         * than a 1000 mm table at zoom-to-fit, and a duration that ran past the
         * edge would collide with whatever stands beside it - which is the
         * table a host is comparing it against.
         */
        durationSize:
          seatsSize *
          fitScale(
            (duration ?? '').length * seatsSize * CHARACTER_WIDTH_RATIO,
            textRoom(item),
          ),
        seats,
        seatsText,
        seatsSize,
        seatsY,
        seatsTextX: blockLeft + glyphWidth + gap,
        seatHeadX: blockLeft + glyphWidth / 2,
        seatHeadY: seatsY - seatsSize * SEAT_HEAD_OFFSET_RATIO,
        seatHeadRadius: seatsSize * SEAT_HEAD_RADIUS_RATIO,
        seatShoulders: `M ${blockLeft} ${shoulderBottom} L ${blockLeft} ${shoulderTop} A ${glyphWidth / 2} ${
          shoulderBottom - shoulderTop
        } 0 0 1 ${blockLeft + glyphWidth} ${shoulderTop} L ${
          blockLeft + glyphWidth
        } ${shoulderBottom} Z`,
      };
    });
  });

  /**
   * One table's live status, laid out above its number (GitHub issue #1093).
   *
   * The glyph and the word are one block centred on the table, for the same
   * reason the seated figure and the capacity are: a long status pushed off to
   * one side would make a room of mixed statuses look like a room of misaligned
   * tables. The word's width is estimated rather than measured, because
   * measuring text means rendering it first and this runs while the viewport is
   * being computed - and an estimate that errs wide nudges a long word left,
   * which is the harmless direction.
   */
  private statusView(
    item: FloorPlanItem,
    status: TableStatus,
    labelSize: Millimetres,
    stack: Millimetres,
    hairline: Millimetres,
  ): StatusView {
    const mark = tableStatusMark(status);
    const size = labelSize * STATUS_GLYPH_RATIO;

    return {
      colour: mark.colour,
      tint: withAlpha(mark.colour, STATUS_TINT_ALPHA),
      glyphPath: tableStatusGlyphPath(
        mark.glyph,
        item.position.x,
        item.position.y - stack * STATUS_ROW_OFFSET,
        size,
      ),
      glyphFilled: mark.filled,
      glyphStrokeWidth: hairline * ITEM_HAIRLINES,
    };
  }

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

    // Nothing is resized or rotated on the live view, so a selected table there
    // gets the heavier outline every selection gets and no handles at all —
    // eight grips round a table staff are about to seat a party at would invite
    // exactly the gesture the view exists to refuse.
    return ids.length === 1 && !this.readOnly()
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

  /**
   * The scale reference: a round distance, and how wide it is on screen.
   *
   * The distance is still chosen from the viewport, so it is a round number of
   * metres that fits in about a fifth of what is visible. Only the *drawn*
   * length is a pixel measurement, which is the one thing an overlay outside
   * the viewBox cannot express any other way.
   *
   * Reports zero width before the element has been measured. A bar of no width
   * is honest about knowing no scale yet, and the caption beside it still says
   * what one is being drawn.
   */
  readonly scaleBar = computed(() => {
    const viewport = this.viewport();
    const length = scaleBarLength(viewport.width);
    const perPixel = millimetresPerPixel(viewport, this.elementSize());

    return {
      pixels: perPixel === undefined ? 0 : length / perPixel,
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
   *
   * On the live view of issue #1093 nothing moves, so every press pans and
   * whether it lands on a table is decided when the pointer comes *up*: a press
   * that stayed put is a tap on that table, and a press that travelled is
   * somebody dragging the room into view. Deciding on the way down would have
   * meant choosing between a plan that cannot be panned by starting on a table
   * and a tap that selects nothing.
   */
  onPointerDown(event: PointerEvent): void {
    const element = this.svg()?.nativeElement;

    if (!element || !this.room()) {
      return;
    }

    // Captured so a gesture that leaves the canvas keeps going, rather than
    // stopping at the edge and leaving the plan half-moved.
    element.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size >= 2) {
      this.startPinch();

      return;
    }

    const target = event.target instanceof Element ? event.target : undefined;
    const itemId =
      target?.closest('[data-item-id]')?.getAttribute('data-item-id') ??
      undefined;

    if (this.readOnly()) {
      this.startRead(itemId, event);

      return;
    }

    const handle = target
      ?.closest('[data-handle]')
      ?.getAttribute('data-handle');

    if (handle) {
      this.startHandleGesture(handle);

      return;
    }

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

    if (this.pointers.has(event.pointerId)) {
      this.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });
    }

    if (gesture.kind === 'pinch') {
      this.pinchWith(gesture);

      return;
    }

    this.trackTravel(event);

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
  onPointerUp(event?: PointerEvent): void {
    const gesture = this.gesture();
    const press = this.press;

    if (event) {
      this.pointers.delete(event.pointerId);
    } else {
      this.pointers.clear();
    }

    // A pinch that loses one finger leaves the other resting on the plan. It
    // does not become a pan: the remaining finger has not travelled since the
    // pinch began, so resuming would jump the plan by however far it moved
    // while the two were spread.
    if (gesture?.kind === 'pinch' && this.pointers.size > 0) {
      return;
    }

    this.endPress();
    this.panFrom = undefined;
    this.gesture.set(undefined);

    if (press && !press.travelled && !press.longPressed && press.itemId) {
      this.selectionChange.emit([press.itemId]);

      return;
    }

    if (press && !press.travelled && !press.longPressed) {
      this.selectionChange.emit([]);

      return;
    }

    if (
      gesture &&
      gesture.kind !== 'pan' &&
      gesture.kind !== 'pinch' &&
      this.hasMoved(gesture.preview)
    ) {
      this.itemsChange.emit(gesture.preview);
    }
  }

  /**
   * The browser's own long-press and right-click menu, turned into the
   * canvas's (GitHub issue #1093).
   *
   * Two things arrive here: a right-click on a table, and - on the platforms
   * that synthesise it - a finger held on one. Both mean "what can I do with
   * this table", so both raise {@link longPress} and neither is allowed to open
   * the browser's menu over the plan. The held-finger timer below covers the
   * platforms that synthesise nothing.
   */
  onContextMenu(event: MouseEvent): void {
    if (!this.readOnly()) {
      return;
    }

    event.preventDefault();

    const target = event.target instanceof Element ? event.target : undefined;
    const itemId = target
      ?.closest('[data-item-id]')
      ?.getAttribute('data-item-id');

    if (itemId) {
      this.raiseLongPress(itemId);
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
    if (!this.room() || this.readOnly()) {
      return;
    }

    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  }

  onDrop(event: DragEvent): void {
    if (!this.room() || this.readOnly()) {
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
   *
   * Tab walks the objects, which is the one thing that had no keyboard path at
   * all until issue #1089: every one of those mutations needs something
   * selected first, and selecting was a press on a shape.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (
      this.handleTraversalKey(event) ||
      this.handleCommandKey(event) ||
      this.handleSelectionKey(event)
    ) {
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

  /**
   * Tab walks the plan object by object, and off either end of it.
   *
   * Stepping past the last object drops the selection and lets the key through,
   * so the focus leaves for the next control the way it would from any other
   * element - a keyboard is never shut inside the drawing, and no separate
   * "press escape to get out" rule has to be learned or announced. Tab into the
   * canvas therefore starts at the first object and shift-tab out of the first
   * one leaves backwards.
   *
   * The order is the order the plan is stored and drawn in, not reading order
   * across the room. A reading order would be recomputed from the positions,
   * so nudging a table 200 mm could put it before the one the owner had just
   * come from, and the next press would walk backwards.
   */
  private handleTraversalKey(event: KeyboardEvent): boolean {
    if (event.key !== 'Tab' || !this.room()) {
      return false;
    }

    const next = this.itemAfterSelection(event.shiftKey);

    if (!next) {
      if (this.selectedIds().length > 0) {
        this.selectionChange.emit([]);
      }

      return false;
    }

    this.selectionChange.emit([next.id]);
    this.reveal(next);

    return true;
  }

  /**
   * The object one step from the selection, or nothing at either end.
   *
   * A step from a group of several leaves from its edge - forwards from the
   * last of them and backwards from the first - so walking out of a
   * select-all covers the plan rather than restarting in the middle of it.
   */
  private itemAfterSelection(backwards: boolean): FloorPlanItem | undefined {
    const items = this.items();
    const selection = this.selection();
    const selected = items
      .map((item, index) => (selection.has(item.id) ? index : -1))
      .filter((index) => index >= 0);

    if (selected.length === 0) {
      return backwards ? undefined : items[0];
    }

    const from = backwards ? Math.min(...selected) : Math.max(...selected);

    return items[backwards ? from - 1 : from + 1];
  }

  /**
   * Brings an object the keyboard has just landed on into view.
   *
   * Only the keyboard needs this. A pointer can only press what is already on
   * screen, so selecting used to imply seeing; tabbing through a plan zoomed
   * in on one corner does not, and nudging a table nobody can see is not an
   * edit an owner can check. The pan is the same clamped centre a drag
   * produces, so the plan cannot be pushed off the canvas by it either.
   */
  private reveal(item: FloorPlanItem): void {
    const room = this.room();

    if (!room || isWithinViewport(itemBounds(item), this.viewport())) {
      return;
    }

    this.pannedCentre.set(clampCentre(item.position, room.size));
  }

  /** The editor commands, which change which items exist rather than where. */
  private handleCommandKey(event: KeyboardEvent): boolean {
    // None of them exist on the live view. Letting them through unhandled is
    // what keeps the platform's own shortcuts - select all, undo in a field
    // elsewhere on the page - working over a plan that has nothing to undo.
    if (this.readOnly()) {
      return false;
    }

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

    /*
     * Enter and space are the keyboard's long press (GitHub issue #1093).
     *
     * The canvas is one tab stop with `aria-activedescendant` on it, so the
     * table a keyboard has walked on to cannot be "clicked" - there is nothing
     * focused to press. Without this, every action on a table would be
     * reachable by touch and by pointer and by neither of the two keys a
     * keyboard user tries first.
     */
    if (this.readOnly()) {
      if (event.key === 'Enter' || event.key === ' ') {
        this.longPress.emit(selected[selected.length - 1].id);

        return true;
      }

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

  /**
   * A press on the live view: pan now, decide what it was on release
   * (GitHub issue #1093).
   *
   * The long-press timer starts here and only over a table, because holding a
   * finger on bare floor has nothing to offer. It is cleared by any travel, so
   * a drag that begins on a table pans the plan instead of opening its actions
   * under a moving finger.
   */
  private startRead(itemId: string | undefined, event: PointerEvent): void {
    this.press = {
      itemId,
      from: { x: event.clientX, y: event.clientY },
      travelled: false,
      longPressed: false,
    };
    this.panFrom = { x: event.clientX, y: event.clientY };
    this.gesture.set({ kind: 'pan' });

    if (itemId) {
      this.longPressTimer = setTimeout(() => {
        const press = this.press;

        if (press && !press.travelled) {
          press.longPressed = true;
          this.raiseLongPress(itemId);
        }
      }, LONG_PRESS_MS);
    }
  }

  /** Whether the press has moved far enough to stop being a tap. */
  private trackTravel(event: PointerEvent): void {
    const press = this.press;

    if (!press || press.travelled) {
      return;
    }

    const moved =
      Math.abs(event.clientX - press.from.x) > TAP_SLOP_PIXELS ||
      Math.abs(event.clientY - press.from.y) > TAP_SLOP_PIXELS;

    if (moved) {
      press.travelled = true;
      this.clearLongPressTimer();
    }
  }

  private endPress(): void {
    this.press = undefined;
    this.clearLongPressTimer();
  }

  private clearLongPressTimer(): void {
    if (this.longPressTimer !== undefined) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = undefined;
    }
  }

  /**
   * Selects the table first, then reports the hold.
   *
   * In that order, because whatever the caller opens is about *this* table and
   * the plan should already be showing which one it means by the time it
   * appears.
   */
  private raiseLongPress(itemId: string): void {
    if (!this.selectedIds().includes(itemId)) {
      this.selectionChange.emit([itemId]);
    }

    this.longPress.emit(itemId);
  }

  /**
   * Two fingers: from here the plan is zoomed and panned together
   * (GitHub issue #1093).
   *
   * Whatever one finger had started is abandoned rather than finished, so a
   * pinch that began with a thumb resting on a table leaves the table where it
   * was. In the editor that also means no half-move is emitted, which is the
   * behaviour `Escape` already has.
   */
  private startPinch(): void {
    this.clearLongPressTimer();
    this.press = undefined;
    this.panFrom = undefined;

    const [first, second] = [...this.pointers.values()];

    this.gesture.set({
      kind: 'pinch',
      spread: Math.hypot(second.x - first.x, second.y - first.y),
      centre: {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      },
    });
  }

  /**
   * The plan follows the two fingers: the spread sets the zoom, the midpoint
   * sets the pan.
   *
   * The zoom is applied about the viewport's own centre and the drift of the
   * midpoint is applied as a pan on top, rather than zooming about the point
   * between the fingers. The two are the same gesture to a hand holding a
   * tablet, and the viewport is already clamped to the room, so anchoring on
   * the pinch point would mostly mean fighting that clamp at the edges of a
   * plan.
   */
  private pinchWith(gesture: Extract<CanvasGesture, { kind: 'pinch' }>): void {
    const room = this.room();
    const element = this.svg()?.nativeElement;
    const [first, second] = [...this.pointers.values()];

    if (!room || !element || !first || !second) {
      return;
    }

    const spread = Math.hypot(second.x - first.x, second.y - first.y);
    const centre = {
      x: (first.x + second.x) / 2,
      y: (first.y + second.y) / 2,
    };
    const perPixel = millimetresPerPixel(
      this.viewport(),
      element.getBoundingClientRect(),
    );

    if (gesture.spread > 0 && spread > 0) {
      this.zoom.update((zoom) => clampZoom((zoom * spread) / gesture.spread));
    }

    if (perPixel !== undefined) {
      this.panBy(
        -(centre.x - gesture.centre.x) * perPixel,
        -(centre.y - gesture.centre.y) * perPixel,
      );
    }

    this.gesture.set({ kind: 'pinch', spread, centre });
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
