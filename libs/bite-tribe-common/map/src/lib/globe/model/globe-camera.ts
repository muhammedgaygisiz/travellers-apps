import {
  geoCentroid,
  geoContains,
  geoDistance,
  geoOrthographic,
  geoPath,
  type GeoProjection,
} from 'd3';
import type { CountryOutline } from './globe-outlines';

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 12;

/** From this zoom on, the coarse outlines look blocky and the fine ones load. */
export const FINE_DETAIL_ZOOM = 3;

/** The share of the globe's width a tapped country is zoomed to fill. */
const FIT_SHARE = 0.55;

/** How far the globe tilts before the poles would turn over. */
const MAX_TILT = 85;

/** The gap between the globe's rim and the canvas edge, in pixels. */
const RIM_GAP = 4;

const DEGREES_PER_RADIAN = 180 / Math.PI;

export type LonLat = [number, number];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const clampZoom = (zoom: number): number =>
  clamp(zoom, MIN_ZOOM, MAX_ZOOM);

/**
 * The point the globe turns to on open: the middle of the given countries,
 * averaged on the sphere rather than in degrees, so countries on both sides
 * of the date line do not average out to the middle of Africa.
 */
export const centreOf = (outlines: CountryOutline[]): LonLat | undefined => {
  if (!outlines.length) {
    return undefined;
  }

  let x = 0;
  let y = 0;
  let z = 0;

  for (const outline of outlines) {
    const [lon, lat] = geoCentroid(outline.feature);
    const longitude = lon / DEGREES_PER_RADIAN;
    const latitude = lat / DEGREES_PER_RADIAN;

    x += Math.cos(latitude) * Math.cos(longitude);
    y += Math.cos(latitude) * Math.sin(longitude);
    z += Math.sin(latitude);
  }

  return [
    Math.atan2(y, x) * DEGREES_PER_RADIAN,
    Math.atan2(z, Math.hypot(x, y)) * DEGREES_PER_RADIAN,
  ];
};

/**
 * Where the globe is looking and how close. Plain state with no DOM, so the
 * spin, the drag, the zoom and the tap hit-test are tested without a canvas.
 */
export class GlobeCamera {
  /** d3 rotation: the negated longitude and latitude facing the viewer. */
  rotation: LonLat = [0, -20];
  zoom = MIN_ZOOM;

  constructor(public size: number) {}

  get radius(): number {
    return Math.max(0, this.size / 2 - RIM_GAP) * this.zoom;
  }

  /** The longitude and latitude in the middle of the view. */
  get centre(): LonLat {
    return [-this.rotation[0], -this.rotation[1]];
  }

  projection(): GeoProjection {
    return geoOrthographic()
      .translate([this.size / 2, this.size / 2])
      .scale(this.radius)
      .rotate(this.rotation)
      .clipAngle(90)
      .precision(0.5);
  }

  lookAt([lon, lat]: LonLat): void {
    this.rotation = [-lon, clamp(-lat, -MAX_TILT, MAX_TILT)];
  }

  /**
   * Turns the globe by a drag of `dx`, `dy` pixels. The surface under the
   * finger moves with it at any zoom: one pixel is one pixel of arc at the
   * current radius, so a zoomed-in globe turns slower.
   */
  rotateBy(dx: number, dy: number): void {
    const degreesPerPixel = this.radius ? DEGREES_PER_RADIAN / this.radius : 0;
    const [longitude, latitude] = this.rotation;

    this.rotation = [
      longitude + dx * degreesPerPixel,
      clamp(latitude - dy * degreesPerPixel, -MAX_TILT, MAX_TILT),
    ];
  }

  zoomTo(zoom: number): void {
    this.zoom = clampZoom(zoom);
  }

  /** Whether a point on the sphere faces the viewer. */
  faces(point: LonLat): boolean {
    return geoDistance(point, this.centre) < Math.PI / 2;
  }

  /** The country under a canvas point, if the point is on the globe at all. */
  hit(
    [x, y]: [number, number],
    outlines: CountryOutline[],
  ): CountryOutline | undefined {
    const middle = this.size / 2;

    if (Math.hypot(x - middle, y - middle) > this.radius) {
      return undefined;
    }

    const point = this.projection().invert?.([x, y]);

    return point
      ? outlines.find((outline) => geoContains(outline.feature, point))
      : undefined;
  }

  /**
   * The rotation and zoom that put a country in the middle of the view at the
   * size {@link FIT_SHARE} asks for. A country larger than that, like Russia,
   * stays at the zoom that shows the whole globe.
   */
  fit(outline: CountryOutline): { rotation: LonLat; zoom: number } {
    const [lon, lat] = geoCentroid(outline.feature);
    const facing = new GlobeCamera(this.size);

    facing.lookAt([lon, lat]);

    const [[x0, y0], [x1, y1]] = geoPath(facing.projection()).bounds(
      outline.feature,
    );
    const span = Math.max(x1 - x0, y1 - y0);
    const zoom =
      span > 0 && Number.isFinite(span)
        ? clampZoom((this.size * FIT_SHARE) / span)
        : MAX_ZOOM;

    return { rotation: facing.rotation, zoom };
  }
}
