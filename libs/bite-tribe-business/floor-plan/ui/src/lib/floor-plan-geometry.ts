import {
  FloorPlanPoint,
  FloorPlanRotation,
  FloorPlanSize,
  Millimetres,
} from 'model';
import { snapToGrid } from './floor-plan-grid';
import { FloorPlanItem } from './floor-plan-item';
import { clampCentre } from './floor-plan-viewport';

/**
 * The geometry of editing a floor plan (GitHub issue #1083).
 *
 * Everything here is a pure function over millimetres. No signals, no DOM, no
 * pointer events: the canvas turns a gesture into numbers and then asks this
 * module what the numbers mean, which is what lets snapping, clamping,
 * resizing and rotation be asserted without rendering anything.
 *
 * ## The one rule about the room
 *
 * An object's centre stays inside the room rectangle. That is the whole of
 * "prevent objects from being positioned entirely outside their room": a shape
 * whose centre is on the floor necessarily overlaps the floor, so nothing can
 * be dragged off the plan and lost, while a wall or a bar counter can still sit
 * half outside the outline where a real one does.
 *
 * Clamping the *bounds* instead was the obvious alternative and is wrong here.
 * It would refuse to let a 3 m bar overhang the wall it is built into, and a
 * rotated object's bounds grow as it turns, so a table would shove itself away
 * from the wall as the owner rotated it.
 */

/** The smallest object worth drawing: 100 mm, a hand's width. */
export const MIN_ITEM_SIDE: Millimetres = 100;

/**
 * The largest, at 50 m.
 *
 * A quarter of the 200 m room limit, so a slipped resize is refused rather than
 * producing an object nobody can find the handles of.
 */
export const MAX_ITEM_SIDE: Millimetres = 50_000;

/**
 * How close two edges have to be before one snaps to the other, in millimetres.
 *
 * A fixed physical distance rather than a share of the zoom, because the owner
 * is aligning real furniture: 150 mm is close enough that they meant it and far
 * enough that a table does not jump to a wall it is standing well clear of.
 */
export const EDGE_SNAP_TOLERANCE: Millimetres = 150;

/** Where a duplicate lands when there is no grid to offset it by. */
export const DUPLICATE_OFFSET: Millimetres = 250;

/** How far one arrow-key nudge moves when snapping is off. */
export const FINE_NUDGE_STEP: Millimetres = 10;

/** How many nudge steps a shift-arrow covers. */
export const COARSE_NUDGE_FACTOR = 5;

/** The increments a rotate gesture snaps to while shift is held. */
export const ROTATION_SNAP_DEGREES = 15;

/** An axis-aligned rectangle in room millimetres. */
export interface FloorPlanBounds {
  left: Millimetres;
  top: Millimetres;
  right: Millimetres;
  bottom: Millimetres;
}

/** The handles a selected item is resized by. */
export type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export const RESIZE_HANDLES: readonly ResizeHandle[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
];

const RADIANS_PER_DEGREE = Math.PI / 180;

/**
 * Degrees brought into the model's `0` to `359`, as a whole number.
 *
 * The model documents the range as a contract TypeScript cannot express, so
 * every path that produces a rotation ends here. A gesture produces a float and
 * a negative angle just as easily as it produces `42`.
 */
export const normaliseRotation = (degrees: number): FloorPlanRotation =>
  ((Math.round(degrees) % 360) + 360) % 360;

/** A point turned clockwise about another point. */
export const rotatePoint = (
  point: FloorPlanPoint,
  origin: FloorPlanPoint,
  degrees: number,
): FloorPlanPoint => {
  const radians = degrees * RADIANS_PER_DEGREE;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;

  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
};

export const roomBounds = (room: FloorPlanSize): FloorPlanBounds => ({
  left: 0,
  top: 0,
  right: room.width,
  bottom: room.height,
});

/**
 * The axis-aligned box an item occupies once it is turned.
 *
 * A round item reports its unrotated box, because a circle does not change
 * shape when it turns. Taking the rotated corners of the square it is drawn in
 * would grow its bounds by up to 41% at 45 degrees, and a round table would
 * then refuse to sit flush against the wall a rectangular one snaps to.
 */
export const itemBounds = (item: FloorPlanItem): FloorPlanBounds => {
  const { position, size, rotation, round } = item;
  const halfWidth = size.width / 2;
  const halfHeight = size.height / 2;

  if (round || normaliseRotation(rotation) === 0) {
    return {
      left: position.x - halfWidth,
      top: position.y - halfHeight,
      right: position.x + halfWidth,
      bottom: position.y + halfHeight,
    };
  }

  const corners = [
    { x: position.x - halfWidth, y: position.y - halfHeight },
    { x: position.x + halfWidth, y: position.y - halfHeight },
    { x: position.x + halfWidth, y: position.y + halfHeight },
    { x: position.x - halfWidth, y: position.y + halfHeight },
  ].map((corner) => rotatePoint(corner, position, rotation));

  const xs = corners.map((corner) => corner.x);
  const ys = corners.map((corner) => corner.y);

  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
};

/** Both coordinates moved to the nearest grid line. */
export const snapPointToGrid = (
  point: FloorPlanPoint,
  spacing: Millimetres,
): FloorPlanPoint => ({
  x: snapToGrid(point.x, spacing),
  y: snapToGrid(point.y, spacing),
});

/**
 * The nudge one arrow key covers, and the one shift-arrow covers.
 *
 * A nudge is one grid cell while snapping is on, which is what keeps a snapped
 * plan snapped: an owner who lined a row of tables up on the half-metre does
 * not want the arrow key to take one of them 10 mm off it. With the grid off
 * there is nothing to stay on, so the step drops to {@link FINE_NUDGE_STEP}.
 */
export const nudgeStep = (
  spacing: Millimetres,
  coarse: boolean,
): Millimetres => {
  const step = spacing > 0 ? spacing : FINE_NUDGE_STEP;

  return coarse ? step * COARSE_NUDGE_FACTOR : step;
};

/**
 * The smallest shift that would align one of `bounds`' edges with a neighbour's.
 *
 * Runs per axis and reports `0` for an axis with nothing in range, so the caller
 * adds the result to a delta it has already grid-snapped. Edge snapping is
 * applied *after* the grid on purpose: an owner pushing a table towards a wall
 * means the wall, and a grid line 40 mm short of it is not what they were
 * aiming at.
 */
export const edgeSnapOffset = (
  bounds: FloorPlanBounds,
  neighbours: readonly FloorPlanBounds[],
  tolerance: Millimetres = EDGE_SNAP_TOLERANCE,
): FloorPlanPoint => {
  const best = (
    moving: readonly Millimetres[],
    fixed: readonly Millimetres[],
  ): Millimetres => {
    let offset = 0;
    let distance = tolerance;

    moving.forEach((from) =>
      fixed.forEach((to) => {
        const candidate = to - from;

        if (Math.abs(candidate) < distance) {
          distance = Math.abs(candidate);
          offset = candidate;
        }
      }),
    );

    return offset;
  };

  return {
    x: best(
      [bounds.left, bounds.right],
      neighbours.flatMap((neighbour) => [neighbour.left, neighbour.right]),
    ),
    y: best(
      [bounds.top, bounds.bottom],
      neighbours.flatMap((neighbour) => [neighbour.top, neighbour.bottom]),
    ),
  };
};

/**
 * A translation trimmed so that every moved item keeps its centre in the room.
 *
 * Trimmed rather than applied per item, because a selection is dragged as one
 * rigid thing: clamping each centre separately would let the item that hit the
 * wall stop while the rest of the group slid on, and an owner who dragged four
 * tables into a corner would get their spacing rearranged for them.
 */
export const clampDeltaToRoom = (
  items: readonly FloorPlanItem[],
  delta: FloorPlanPoint,
  room: FloorPlanSize,
): FloorPlanPoint => {
  if (items.length === 0) {
    return delta;
  }

  const trim = (
    value: number,
    upper: readonly number[],
    lower: readonly number[],
  ): number => Math.max(Math.min(value, ...upper), ...lower);

  return {
    x: trim(
      delta.x,
      items.map((item) => room.width - item.position.x),
      items.map((item) => -item.position.x),
    ),
    y: trim(
      delta.y,
      items.map((item) => room.height - item.position.y),
      items.map((item) => -item.position.y),
    ),
  };
};

/** Every item translated by the same amount, with each centre kept in the room. */
export const offsetItems = (
  items: readonly FloorPlanItem[],
  delta: FloorPlanPoint,
  room: FloorPlanSize,
): FloorPlanItem[] => {
  const allowed = clampDeltaToRoom(items, delta, room);

  return items.map((item) => ({
    ...item,
    position: clampCentre(
      { x: item.position.x + allowed.x, y: item.position.y + allowed.y },
      room,
    ),
  }));
};

/** What a move gesture needs to know about the plan it is happening on. */
export interface MoveContext {
  room: FloorPlanSize;
  /** Grid spacing, or `0` while snapping is off. */
  spacing: Millimetres;
  /** The edges the dragged selection may snap to: the other items and the room. */
  neighbours: readonly FloorPlanBounds[];
}

/**
 * A selection dragged by `delta`, snapped and kept on the floor.
 *
 * The whole selection follows one item — the one the pointer went down on —
 * because a group has no single edge to snap and no single centre to land on a
 * grid line. Snapping the dragged item and translating the rest by the same
 * amount keeps the group's internal spacing exactly as the owner built it,
 * which is the point of having grouped them.
 */
export const moveItems = (
  items: readonly FloorPlanItem[],
  primaryId: string,
  delta: FloorPlanPoint,
  context: MoveContext,
): FloorPlanItem[] => {
  const primary = items.find((item) => item.id === primaryId) ?? items[0];

  if (!primary) {
    return [];
  }

  const dragged = {
    x: primary.position.x + delta.x,
    y: primary.position.y + delta.y,
  };
  const snapped = snapPointToGrid(dragged, context.spacing);
  const edge = edgeSnapOffset(
    itemBounds({ ...primary, position: snapped }),
    context.neighbours,
  );

  return offsetItems(
    items,
    {
      x: snapped.x + edge.x - primary.position.x,
      y: snapped.y + edge.y - primary.position.y,
    },
    context.room,
  );
};

/** A side length brought inside the editor's limits and on to the grid. */
export const snapSide = (
  side: Millimetres,
  spacing: Millimetres,
): Millimetres => {
  const snapped = snapToGrid(side, spacing);

  return Math.min(MAX_ITEM_SIDE, Math.max(MIN_ITEM_SIDE, snapped));
};

/**
 * One item resized by dragging `handle` to `pointer`.
 *
 * The pointer is turned into the item's own unrotated frame first, so a handle
 * on a table standing at 30 degrees still grows the table along its own length
 * rather than along the room's. The edge opposite the handle stays where it is,
 * which is what makes a resize feel like pulling one side rather than scaling
 * about the middle.
 *
 * The *side* is snapped to the grid rather than the dragged edge's position,
 * because a rotated item's edge does not lie on a room axis at all. Half-metre
 * tables come out of a half-metre grid whatever angle they stand at.
 */
export const resizeItem = (
  item: FloorPlanItem,
  handle: ResizeHandle,
  pointer: FloorPlanPoint,
  context: { room: FloorPlanSize; spacing: Millimetres },
): FloorPlanItem => {
  const local = rotatePoint(pointer, item.position, -item.rotation);
  const halfWidth = item.size.width / 2;
  const halfHeight = item.size.height / 2;

  const west = handle.includes('w');
  const east = handle.includes('e');
  const north = handle.startsWith('n');
  const south = handle.startsWith('s');

  const draggedWidth = west
    ? halfWidth + (item.position.x - local.x)
    : east
      ? halfWidth + (local.x - item.position.x)
      : item.size.width;
  const draggedHeight = north
    ? halfHeight + (item.position.y - local.y)
    : south
      ? halfHeight + (local.y - item.position.y)
      : item.size.height;

  let width = snapSide(draggedWidth, context.spacing);
  let height = snapSide(draggedHeight, context.spacing);

  if (item.round) {
    // A round table has one measurement. The handle that moved the most decides
    // it, so a corner drag behaves the way a corner drag looks.
    const diameter =
      Math.abs(width - item.size.width) >= Math.abs(height - item.size.height)
        ? width
        : height;

    width = diameter;
    height = diameter;
  }

  /*
   * The opposite edge is the anchor, so the centre moves by half of whatever
   * the dragged side gained — in the item's own frame, then rotated back into
   * the room's.
   */
  const shift = rotatePoint(
    {
      x: ((width - item.size.width) / 2) * (west ? -1 : east ? 1 : 0),
      y: ((height - item.size.height) / 2) * (north ? -1 : south ? 1 : 0),
    },
    { x: 0, y: 0 },
    item.rotation,
  );

  return {
    ...item,
    size: { width, height },
    position: clampCentre(
      { x: item.position.x + shift.x, y: item.position.y + shift.y },
      context.room,
    ),
  };
};

/**
 * The rotation that points an item's top edge at `pointer`.
 *
 * Ninety degrees are added because the rotate handle is drawn above the item:
 * an unrotated item's handle is straight up, which is `-90` degrees in screen
 * terms, and the owner expects that position to read as `0`.
 */
export const rotationTowards = (
  centre: FloorPlanPoint,
  pointer: FloorPlanPoint,
  snapDegrees = 0,
): FloorPlanRotation => {
  const degrees =
    Math.atan2(pointer.y - centre.y, pointer.x - centre.x) /
      RADIANS_PER_DEGREE +
    90;

  return normaliseRotation(
    snapDegrees > 0 ? Math.round(degrees / snapDegrees) * snapDegrees : degrees,
  );
};
