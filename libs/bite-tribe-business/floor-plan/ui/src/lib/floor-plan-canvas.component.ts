import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  linkedSignal,
  signal,
  viewChild,
} from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import { FloorPlanPoint, Millimetres, Room } from 'model';
import { DEFAULT_GRID_SPACING } from './floor-plan-grid';
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
 * Ids have to be unique per instance: an SVG `<pattern>` and a `<clipPath>`
 * are referenced by id, and two canvases on one page — Storybook shows
 * several — would otherwise share whichever pair was defined last.
 */
let instanceCount = 0;

/**
 * One room drawn as a plan, and the viewport an owner moves over it
 * (GitHub issue #1082).
 *
 * ## Millimetres, not pixels
 *
 * The SVG `viewBox` *is* the viewport, expressed in room millimetres, so the
 * component draws a plan without ever asking how large it is on screen: the
 * browser scales the whole thing, one stored room renders identically on a
 * laptop and on paper, and there is no device assumption to get wrong. Even the
 * scale reference and its label are sized as a share of the viewport rather
 * than in pixels, which is what keeps them a constant size on screen at every
 * zoom level.
 *
 * Pixels enter in exactly one place — turning a pointer's travel into a pan,
 * where the browser has already measured the element for us.
 *
 * ## What it does not do
 *
 * It cannot read or write a room. This library is tagged `type:ui`, and
 * `@nx/enforce-module-boundaries` forbids `type:ui` from importing
 * `type:data-access`, so the canvas is structurally unable to save: it takes a
 * `Room` and draws it. Pan, zoom and the grid are viewport state and change no
 * stored field — the room's `version` after panning is the version it had after
 * the last save.
 *
 * Objects and tables are not drawn here yet. They are projected: anything the
 * caller puts in the element's content is rendered inside this viewBox, in the
 * same millimetre space, which is where the placement work of issue #1083 will
 * draw. Angular needs the `svg:` prefix on projected SVG elements, because the
 * namespace is decided in the caller's template rather than in this one.
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

  readonly panning = signal(false);

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

  onPointerDown(event: PointerEvent): void {
    const element = this.svg()?.nativeElement;

    if (!element || !this.room()) {
      return;
    }

    // Captured so a drag that leaves the canvas keeps panning it, rather than
    // stopping at the edge and leaving the plan half-moved.
    element.setPointerCapture?.(event.pointerId);
    this.panFrom = { x: event.clientX, y: event.clientY };
    this.panning.set(true);
  }

  onPointerMove(event: PointerEvent): void {
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

  /**
   * Ends a pan, and does nothing when there was none.
   *
   * Capture is not released here: the Pointer Events spec releases it
   * implicitly on `pointerup` and `pointercancel`, and calling
   * `releasePointerCapture` for a pointer that is no longer captured throws.
   */
  onPointerUp(): void {
    if (!this.panFrom) {
      return;
    }

    this.panFrom = undefined;
    this.panning.set(false);
  }

  /**
   * Arrow keys pan, `+` and `-` zoom, `0` fits.
   *
   * A canvas that can only be moved by dragging cannot be moved without a
   * pointer, and an owner reviewing a plan on a laptop keyboard is the ordinary
   * case rather than an accessibility afterthought.
   */
  onKeyDown(event: KeyboardEvent): void {
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
