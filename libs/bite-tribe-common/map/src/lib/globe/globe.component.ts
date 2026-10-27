import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { geoCentroid, geoGraticule10, geoPath, interpolate } from 'd3';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  centreOf,
  FINE_DETAIL_ZOOM,
  GlobeCamera,
  type LonLat,
} from './model/globe-camera';
import {
  type CountryOutline,
  type GlobeDetail,
  GLOBE_OUTLINE_LOADER,
  toCountryOutlines,
} from './model/globe-outlines';
import { normalizeCountryCodes } from './model/countries';

/** A country the user tapped on the globe. */
export interface GlobeCountryTap {
  countryCode: string;
  /** Whether the country is one of the highlighted ones. */
  visited: boolean;
}

/** What zoomed the globe: the `+` / `-` buttons, or a pinch or wheel. */
export type GlobeZoomControl = 'button' | 'gesture';

/** The largest the globe is drawn, in CSS pixels, however wide the page. */
const MAX_SIZE = 420;

/** Where the globe looks when there is nothing to centre on: Europe. */
const DEFAULT_CENTRE: LonLat = [15, 30];

/** The idle spin, in degrees of longitude per second. */
const SPIN_DEGREES_PER_SECOND = 6;

/** A pointer that moves less than this many pixels has tapped, not dragged. */
const TAP_TOLERANCE = 5;

const BUTTON_ZOOM_STEP = 1.6;
const FLY_MILLISECONDS = 700;
const BUTTON_ZOOM_MILLISECONDS = 250;

/** Below this many square pixels, a highlighted country is drawn as a dot. */
const DOT_AREA = 12;
const DOT_RADIUS = 3;

interface GlobeColours {
  sea: string;
  land: string;
  border: string;
  visited: string;
  selected: string;
  grid: string;
}

const readColours = (element: HTMLElement): GlobeColours => {
  const style = getComputedStyle(element);
  const read = (name: string, fallback: string): string =>
    style.getPropertyValue(name).trim() || fallback;

  return {
    sea: read('--globe-sea', '#e8f1fb'),
    land: read('--globe-land', '#e4e2dc'),
    border: read('--globe-border', '#ffffff'),
    visited: read('--globe-visited', '#4a90d9'),
    selected: read('--globe-selected', '#2f6fb3'),
    grid: read('--globe-grid', '#c9dcf2'),
  };
};

const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A globe with the given countries highlighted (GitHub issue #1787).
 *
 * Drawn with d3 on a canvas from the `world-atlas` outlines: no map tiles, so
 * it needs no network and looks the same every time it is drawn. It can be
 * spun with a drag, zoomed with a pinch, the wheel or the `+` / `-` buttons,
 * and a tapped country is turned to the middle and zoomed to fit.
 *
 * The coarse outlines load with the globe; the fine ones only once a user
 * zooms in far enough to see the difference, or when a highlighted country is
 * too small for the coarse set to have drawn it at all.
 */
@Component({
  selector: 'bt-globe',
  templateUrl: './globe.component.html',
  styleUrl: './globe.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonIcon, TranslocoPipe],
  // The canvas draws without touching the DOM, so these are what tell a
  // screenshot run (Loki's settle check) that the outlines have arrived.
  host: {
    '[attr.data-ready]': 'ready()',
    '[attr.data-detail]': 'detail()',
  },
})
export class GlobeComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly loadOutlines = inject(GLOBE_OUTLINE_LOADER);

  /** Alpha-2 codes of the countries to highlight. */
  countryCodes = input<string[] | null | undefined>([]);

  /** Spin slowly until the first touch. Never spins under reduced motion. */
  autoSpin = input(true, { transform: booleanAttribute });

  /** The country tapped last, cleared by the reset button. */
  selectedCountryCode = model<string | undefined>(undefined);

  countryTap = output<GlobeCountryTap>();
  zoomed = output<GlobeZoomControl>();

  private readonly canvas =
    viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  private readonly visitedCodes = computed(
    () => new Set(normalizeCountryCodes(this.countryCodes())),
  );

  private readonly outlines = signal<CountryOutline[]>([]);
  protected readonly detail = signal<GlobeDetail | undefined>(undefined);

  /** True once the outlines are drawn, so the page can drop its placeholder. */
  readonly ready = computed(() => this.outlines().length > 0);

  private readonly camera = new GlobeCamera(MAX_SIZE);
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private pinchStart: { distance: number; zoom: number } | undefined;
  private dragDistance = 0;
  private interacted = false;
  /** The drawn countries the globe last turned to face, as a sorted key. */
  private centredOn: string | undefined;
  private fineRequested = false;
  private spinning = false;
  private lastSpinFrame: number | undefined;
  private drawRequested = false;
  private flight: number | undefined;
  private destroyed = false;
  /** The selection the globe last turned to, so it turns once per change. */
  private flownTo: string | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);

    destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.stopFlight();
    });

    afterNextRender(() => {
      this.watchSize(destroyRef);
      void this.load('coarse');
    });

    effect(() => {
      this.visitedCodes();
      this.outlines();
      this.selectedCountryCode();
      this.centreOnVisited();
      this.followSelection();
      this.loadFineIfAVisitedCountryIsMissing();
      this.requestDraw();
    });
  }

  zoomIn(): void {
    this.zoomByButton(BUTTON_ZOOM_STEP);
  }

  zoomOut(): void {
    this.zoomByButton(1 / BUTTON_ZOOM_STEP);
  }

  /** Back to the whole globe, facing the highlighted countries again. */
  reset(): void {
    this.stopInteraction();
    this.selectedCountryCode.set(undefined);
    this.flyTo(this.startCentre(), 1, FLY_MILLISECONDS);
  }

  onPointerDown(event: PointerEvent): void {
    this.stopInteraction();
    (event.target as Element | null)?.setPointerCapture?.(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.offsetX, y: event.offsetY });

    if (this.pointers.size === 1) {
      this.dragDistance = 0;
    } else if (this.pointers.size === 2) {
      this.pinchStart = {
        distance: this.pinchDistance(),
        zoom: this.camera.zoom,
      };
      this.dragDistance = Infinity;
    }
  }

  onPointerMove(event: PointerEvent): void {
    const previous = this.pointers.get(event.pointerId);

    if (!previous) {
      return;
    }

    const current = { x: event.offsetX, y: event.offsetY };

    this.pointers.set(event.pointerId, current);

    if (this.pointers.size === 1) {
      const dx = current.x - previous.x;
      const dy = current.y - previous.y;

      this.dragDistance += Math.hypot(dx, dy);
      this.camera.rotateBy(dx, dy);
    } else if (this.pinchStart && this.pinchStart.distance > 0) {
      this.setZoom(
        (this.pinchStart.zoom * this.pinchDistance()) /
          this.pinchStart.distance,
      );
      this.zoomed.emit('gesture');
    }

    this.requestDraw();
  }

  onPointerUp(event: PointerEvent): void {
    const point = this.pointers.get(event.pointerId);
    const wasTap =
      this.pointers.size === 1 && this.dragDistance < TAP_TOLERANCE;

    this.pointers.delete(event.pointerId);

    if (this.pointers.size < 2) {
      this.pinchStart = undefined;
    }

    if (wasTap && point) {
      this.tapAt([point.x, point.y]);
    }
  }

  onPointerCancel(event: PointerEvent): void {
    this.pointers.delete(event.pointerId);
    this.pinchStart = undefined;
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.stopInteraction();
    this.setZoom(this.camera.zoom * Math.exp(-event.deltaY * 0.002));
    this.zoomed.emit('gesture');
    this.requestDraw();
  }

  private tapAt(point: [number, number]): void {
    const outline = this.camera.hit(point, this.outlines());

    if (!outline?.countryCode) {
      return;
    }

    const { countryCode } = outline;

    this.flyToCountry(outline);
    this.selectedCountryCode.set(countryCode);
    this.countryTap.emit({
      countryCode,
      visited: this.visitedCodes().has(countryCode),
    });
  }

  private flyToCountry(outline: CountryOutline): void {
    const { rotation, zoom } = this.camera.fit(outline);

    this.flownTo = outline.countryCode;
    this.flyTo([-rotation[0], -rotation[1]], zoom, FLY_MILLISECONDS);
  }

  /**
   * Turns to a country the host selected - a row in a list - the way a tap on
   * the globe does. A selection already there when the outlines arrive is
   * only highlighted, so a page that opens with one opens still.
   */
  private followSelection(): void {
    const selected = this.selectedCountryCode();
    const outlines = this.outlines();

    if (!outlines.length || !selected) {
      this.flownTo = selected;

      return;
    }

    if (selected === this.flownTo) {
      return;
    }

    const outline = outlines.find((each) => each.countryCode === selected);

    if (outline) {
      this.stopInteraction();
      this.flyToCountry(outline);
    }
  }

  private zoomByButton(factor: number): void {
    this.stopInteraction();
    this.flyTo(
      this.camera.centre,
      this.camera.zoom * factor,
      BUTTON_ZOOM_MILLISECONDS,
    );
    this.zoomed.emit('button');
  }

  private setZoom(zoom: number): void {
    this.camera.zoomTo(zoom);

    if (this.camera.zoom >= FINE_DETAIL_ZOOM) {
      this.requestFine();
    }
  }

  /** The first touch stops the spin and any flight, for good. */
  private stopInteraction(): void {
    this.interacted = true;
    this.spinning = false;
    this.stopFlight();
  }

  private flyTo(centre: LonLat, zoom: number, milliseconds: number): void {
    this.stopFlight();

    const from = { centre: this.camera.centre, zoom: this.camera.zoom };
    // Turn the short way round rather than across the back of the globe.
    const turn = ((centre[0] - from.centre[0] + 540) % 360) - 180;
    const toCentre: LonLat = [from.centre[0] + turn, centre[1]];
    const centreAt = interpolate(from.centre, toCentre);
    const zoomAt = interpolate(from.zoom, zoom);

    if (prefersReducedMotion() || milliseconds <= 0) {
      this.camera.lookAt(toCentre);
      this.setZoom(zoom);
      this.requestDraw();

      return;
    }

    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / milliseconds);
      const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.lookAt(centreAt(eased) as LonLat);
      this.setZoom(zoomAt(eased));
      this.draw();
      this.flight = t < 1 ? requestAnimationFrame(step) : undefined;
    };

    this.flight = requestAnimationFrame(step);
  }

  private stopFlight(): void {
    if (this.flight !== undefined) {
      cancelAnimationFrame(this.flight);
      this.flight = undefined;
    }
  }

  private startCentre(): LonLat {
    const visited = this.visitedCodes();

    return (
      centreOf(
        this.outlines().filter(
          (outline) => outline.countryCode && visited.has(outline.countryCode),
        ),
      ) ?? DEFAULT_CENTRE
    );
  }

  /**
   * Faces the highlighted countries once they and the outlines are both
   * known, unless the user has already turned the globe themselves.
   */
  private centreOnVisited(): void {
    if (this.interacted || !this.outlines().length) {
      return;
    }

    // Only a new set of drawn countries turns the globe: the finer outlines
    // arriving turn it again only if they drew a country the coarse set
    // lacked, so a spinning globe is not snapped back for nothing.
    const drawn = new Set(
      this.outlines().map((outline) => outline.countryCode),
    );
    const key = [...this.visitedCodes()]
      .filter((code) => drawn.has(code))
      .sort()
      .join();

    if (key === this.centredOn) {
      return;
    }

    this.camera.lookAt(this.startCentre());
    this.centredOn = key;
    this.startSpin();
  }

  private loadFineIfAVisitedCountryIsMissing(): void {
    const outlines = this.outlines();

    if (!outlines.length || this.detail() === 'fine') {
      return;
    }

    const drawn = new Set(outlines.map((outline) => outline.countryCode));

    if ([...this.visitedCodes()].some((code) => !drawn.has(code))) {
      this.requestFine();
    }
  }

  private requestFine(): void {
    if (!this.fineRequested) {
      this.fineRequested = true;
      void this.load('fine');
    }
  }

  private async load(detail: GlobeDetail): Promise<void> {
    try {
      const outlines = toCountryOutlines(await this.loadOutlines(detail));

      // The fine set can arrive before the coarse one; never trade it back.
      if (!this.destroyed && this.detail() !== 'fine') {
        this.detail.set(detail);
        this.outlines.set(outlines);
      }
    } catch {
      // A globe without its finer outlines still works with the coarse ones,
      // so a failed fine load is retried the next time it is wanted.
      if (detail === 'fine') {
        this.fineRequested = false;
      }
    }
  }

  private startSpin(): void {
    if (!this.autoSpin() || prefersReducedMotion() || this.spinning) {
      return;
    }

    this.spinning = true;
    this.lastSpinFrame = undefined;

    const spin = (now: number): void => {
      if (!this.spinning || this.destroyed) {
        return;
      }

      const elapsed =
        this.lastSpinFrame === undefined ? 0 : now - this.lastSpinFrame;

      this.lastSpinFrame = now;
      this.camera.rotation = [
        this.camera.rotation[0] + (SPIN_DEGREES_PER_SECOND * elapsed) / 1000,
        this.camera.rotation[1],
      ];
      this.draw();
      requestAnimationFrame(spin);
    };

    requestAnimationFrame(spin);
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pointers.values()];

    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  private watchSize(destroyRef: DestroyRef): void {
    const resize = (): void => {
      const width = this.host.nativeElement.clientWidth || MAX_SIZE;
      const size = Math.min(width, MAX_SIZE);
      const canvas = this.canvas().nativeElement;
      const ratio = globalThis.devicePixelRatio || 1;

      this.camera.size = size;
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
      this.draw();
    };

    resize();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(resize);

      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    }
  }

  private requestDraw(): void {
    if (this.drawRequested || typeof requestAnimationFrame !== 'function') {
      return;
    }

    this.drawRequested = true;
    requestAnimationFrame(() => {
      this.drawRequested = false;
      this.draw();
    });
  }

  private draw(): void {
    const canvas = this.canvas().nativeElement;
    const context = canvas.getContext?.('2d');

    if (!context || this.destroyed) {
      return;
    }

    const colours = readColours(this.host.nativeElement);
    const ratio = canvas.width / (this.camera.size || 1);
    const projection = this.camera.projection();
    const path = geoPath(projection, context);
    const visited = this.visitedCodes();
    const selected = this.selectedCountryCode();
    const middle = this.camera.size / 2;

    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, this.camera.size, this.camera.size);

    context.beginPath();
    context.arc(middle, middle, this.camera.radius, 0, 2 * Math.PI);
    context.fillStyle = colours.sea;
    context.fill();

    context.beginPath();
    path(geoGraticule10());
    context.strokeStyle = colours.grid;
    context.lineWidth = 0.5;
    context.stroke();

    const fillOf = (code: string | undefined): string =>
      code && code === selected
        ? colours.selected
        : code && visited.has(code)
          ? colours.visited
          : colours.land;

    context.strokeStyle = colours.border;
    context.lineWidth = 0.5;

    for (const outline of this.outlines()) {
      context.beginPath();
      path(outline.feature);
      context.fillStyle = fillOf(outline.countryCode);
      context.fill();
      context.stroke();
    }

    // A highlighted country too small to see as a shape still has to show.
    const measure = geoPath(projection);

    for (const outline of this.outlines()) {
      const code = outline.countryCode;

      if (
        !code ||
        !visited.has(code) ||
        measure.area(outline.feature) >= DOT_AREA
      ) {
        continue;
      }

      const centre = geoCentroid(outline.feature) as LonLat;
      const point = this.camera.faces(centre) ? projection(centre) : null;

      if (point) {
        context.beginPath();
        context.arc(point[0], point[1], DOT_RADIUS, 0, 2 * Math.PI);
        context.fillStyle = fillOf(code);
        context.fill();
      }
    }

    context.beginPath();
    context.arc(middle, middle, this.camera.radius, 0, 2 * Math.PI);
    context.strokeStyle = colours.grid;
    context.lineWidth = 1;
    context.stroke();
  }
}
