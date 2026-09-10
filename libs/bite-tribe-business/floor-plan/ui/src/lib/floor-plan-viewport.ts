import { FloorPlanPoint, FloorPlanSize, Millimetres } from 'model';

/**
 * The visible rectangle of a plan, in room millimetres.
 *
 * This is the SVG `viewBox` and nothing else: the canvas never converts a
 * millimetre into a pixel to decide what to draw, so one stored room renders
 * identically at any container size and on paper. Pixels enter in exactly one
 * place — turning a pointer's travel into a pan, where the browser has already
 * told us how big the element is.
 *
 * It is viewport state, so it is held by the component and never stored. A
 * `viewBox` in the room document would mean two owners on two screens fighting
 * over one scroll position.
 */
export interface CanvasViewport {
  x: Millimetres;
  y: Millimetres;
  width: Millimetres;
  height: Millimetres;
}

/**
 * Breathing room around the plan at zoom-to-fit, as a share of the room's
 * longer side.
 *
 * A share of the *longer* side rather than of each side separately, so the
 * margin is the same width on all four edges of a long, narrow room instead of
 * being stretched with it.
 */
export const FIT_MARGIN_RATIO = 0.04;

/** Zoomed out to a quarter of the fit, so a big plan can be seen whole. */
export const MIN_ZOOM = 0.25;

/**
 * Twenty times the fit.
 *
 * Enough to place a 600 mm chair against a wall on a phone-sized viewport, and
 * short of the point where the millimetre grid turns into a solid fill.
 */
export const MAX_ZOOM = 20;

/** The viewport a plan is shown in before there is a room to show. */
export const EMPTY_VIEWPORT: CanvasViewport = {
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
};

/** The size of the viewport at zoom 1: the room plus its margin. */
export const fitViewportSize = (room: FloorPlanSize): FloorPlanSize => {
  const margin = Math.max(room.width, room.height) * FIT_MARGIN_RATIO;

  return {
    width: room.width + 2 * margin,
    height: room.height + 2 * margin,
  };
};

export const roomCentre = (room: FloorPlanSize): FloorPlanPoint => ({
  x: room.width / 2,
  y: room.height / 2,
});

export const clampZoom = (zoom: number): number =>
  Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/**
 * A point kept inside the room.
 *
 * Two callers, one rule. The centre of the *viewport* may sit anywhere on the
 * floor but not off it, so an owner who drags too far still has the plan on
 * screen; clamping the centre rather than the edges means a zoomed-out plan is
 * never pushed out of view and a zoomed-in one can still reach every corner.
 * The centre of an *object* obeys the same clamp from issue #1083 onward, and
 * for the same shape of reason: a shape whose centre is on the floor overlaps
 * the floor, so nothing can be dragged off the plan and lost, while a bar
 * counter can still overhang the wall it is built into.
 */
export const clampCentre = (
  centre: FloorPlanPoint,
  room: FloorPlanSize,
): FloorPlanPoint => ({
  x: Math.min(room.width, Math.max(0, centre.x)),
  y: Math.min(room.height, Math.max(0, centre.y)),
});

/** The viewport for one room at one pan position and one zoom level. */
export const viewportFor = (
  room: FloorPlanSize,
  centre: FloorPlanPoint,
  zoom: number,
): CanvasViewport => {
  const fit = fitViewportSize(room);
  const width = fit.width / zoom;
  const height = fit.height / zoom;

  return {
    x: centre.x - width / 2,
    y: centre.y - height / 2,
    width,
    height,
  };
};

/**
 * The rungs the scale reference is allowed to be.
 *
 * A scale bar whose length is `0.37 m` tells a reader nothing they can measure
 * with, so the bar is always a round distance and its *drawn* length changes
 * with the zoom instead.
 */
export const SCALE_BAR_LENGTHS: readonly Millimetres[] = [
  100, 250, 500, 1000, 2000, 5000, 10_000, 20_000, 50_000,
];

/** How much of the viewport's width the scale reference aims to span. */
export const SCALE_BAR_TARGET_RATIO = 0.2;

/**
 * The longest round distance that still fits in a fifth of the viewport.
 *
 * Falls back to the shortest rung rather than to nothing, so a canvas zoomed
 * all the way in still carries a reference.
 */
export const scaleBarLength = (viewportWidth: Millimetres): Millimetres => {
  const target = viewportWidth * SCALE_BAR_TARGET_RATIO;
  const fitting = SCALE_BAR_LENGTHS.filter((length) => length <= target);

  return fitting.length > 0
    ? fitting[fitting.length - 1]
    : SCALE_BAR_LENGTHS[0];
};

/**
 * How many millimetres one CSS pixel of the rendered element covers.
 *
 * `preserveAspectRatio="xMidYMid meet"` fits the whole viewBox inside the
 * element, so the scale is set by whichever axis runs out first and is the same
 * on both.
 *
 * Reports nothing rather than a number when either rectangle has no area: a
 * zero-sized element is a detached node or a jsdom fixture, and a zero-sized
 * viewport would divide by zero. Both mean there is no scale to pan by, and the
 * caller leaves the plan where it is.
 */
export const millimetresPerPixel = (
  viewport: CanvasViewport,
  element: { width: number; height: number },
): number | undefined => {
  if (
    element.width <= 0 ||
    element.height <= 0 ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    return undefined;
  }

  return (
    1 /
    Math.min(element.width / viewport.width, element.height / viewport.height)
  );
};

/**
 * A client pixel turned into the room millimetre under it.
 *
 * `preserveAspectRatio="xMidYMid meet"` fits the whole viewBox inside the
 * element and centres it, so the spare room along the other axis has to be
 * taken off before the scale is applied — measuring from the element's own
 * corner puts every drop and every resize handle out by half of that gap.
 *
 * Reports nothing rather than a point when there is no scale to measure with,
 * for the reasons on {@link millimetresPerPixel}. A gesture with no scale is a
 * gesture the caller should ignore, not one it should place at the origin.
 */
export const viewportPointAt = (
  viewport: CanvasViewport,
  element: { left: number; top: number; width: number; height: number },
  client: { clientX: number; clientY: number },
): FloorPlanPoint | undefined => {
  const perPixel = millimetresPerPixel(viewport, element);

  if (perPixel === undefined) {
    return undefined;
  }

  const drawnWidth = viewport.width / perPixel;
  const drawnHeight = viewport.height / perPixel;

  return {
    x:
      viewport.x +
      (client.clientX - element.left - (element.width - drawnWidth) / 2) *
        perPixel,
    y:
      viewport.y +
      (client.clientY - element.top - (element.height - drawnHeight) / 2) *
        perPixel,
  };
};
