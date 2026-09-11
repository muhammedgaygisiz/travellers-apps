import { FloorPlanSize } from 'model';
import {
  COARSE_NUDGE_FACTOR,
  EDGE_SNAP_TOLERANCE,
  FINE_NUDGE_STEP,
  MAX_ITEM_SIDE,
  MIN_ITEM_SIDE,
  clampDeltaToRoom,
  edgeSnapOffset,
  isWithinViewport,
  itemBounds,
  moveItems,
  normaliseRotation,
  nudgeStep,
  offsetItems,
  resizeItem,
  roomBounds,
  rotatePoint,
  rotationTowards,
  snapPointToGrid,
  snapSide,
} from '../floor-plan-geometry';
import { FloorPlanItem } from '../floor-plan-item';

const ROOM: FloorPlanSize = { width: 10_000, height: 8000 };

const item = (over: Partial<FloorPlanItem> = {}): FloorPlanItem => ({
  id: 'item-1',
  kind: 'object',
  variant: 'wall',
  position: { x: 5000, y: 4000 },
  size: { width: 2000, height: 1000 },
  rotation: 0,
  round: false,
  ...over,
});

/** Millimetres are integers, but the maths that produces them is not. */
const closeTo = (value: number, expected: number): void =>
  expect(value).toBeCloseTo(expected, 6);

describe('floor plan geometry', () => {
  describe('normaliseRotation', () => {
    it.each([
      [0, 0],
      [90.4, 90],
      [359.6, 0],
      [360, 0],
      [-90, 270],
      [-450, 270],
      [725, 5],
    ])('brings %p into the model range as %p', (given, expected) => {
      expect(normaliseRotation(given)).toBe(expected);
    });

    it('always produces a whole number in 0 to 359', () => {
      [-1000.7, -0.4, 12.5, 180.49, 3600.2].forEach((degrees) => {
        const result = normaliseRotation(degrees);

        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(360);
      });
    });
  });

  describe('rotatePoint', () => {
    it('turns clockwise, which is the direction y grows in', () => {
      const turned = rotatePoint({ x: 100, y: 0 }, { x: 0, y: 0 }, 90);

      closeTo(turned.x, 0);
      closeTo(turned.y, 100);
    });

    it('leaves the origin where it is', () => {
      expect(rotatePoint({ x: 7, y: 9 }, { x: 7, y: 9 }, 137)).toEqual({
        x: 7,
        y: 9,
      });
    });
  });

  describe('itemBounds', () => {
    it('is the plain box for an unrotated item', () => {
      expect(itemBounds(item())).toEqual({
        left: 4000,
        top: 3500,
        right: 6000,
        bottom: 4500,
      });
    });

    it('grows with the rotation of a rectangle', () => {
      const bounds = itemBounds(item({ rotation: 90 }));

      closeTo(bounds.left, 4500);
      closeTo(bounds.right, 5500);
      closeTo(bounds.top, 3000);
      closeTo(bounds.bottom, 5000);
    });

    /*
     * The reason a round item reports its unrotated box: the square it is drawn
     * in would grow by 41% at 45 degrees, and the table would then refuse to sit
     * flush against a wall a rectangular one snaps to.
     */
    it('does not grow when a round item turns', () => {
      const round = item({
        round: true,
        size: { width: 900, height: 900 },
        rotation: 45,
      });

      expect(itemBounds(round)).toEqual(itemBounds({ ...round, rotation: 0 }));
    });
  });

  describe('snapPointToGrid', () => {
    it('moves both coordinates to the nearest line', () => {
      expect(snapPointToGrid({ x: 1240, y: 2760 }, 500)).toEqual({
        x: 1000,
        y: 3000,
      });
    });

    it('only rounds to a whole millimetre with no grid', () => {
      expect(snapPointToGrid({ x: 1240.6, y: 2760.2 }, 0)).toEqual({
        x: 1241,
        y: 2760,
      });
    });
  });

  describe('nudgeStep', () => {
    it('is one grid cell while snapping is on, so a snapped plan stays snapped', () => {
      expect(nudgeStep(500, false)).toBe(500);
    });

    it('falls back to the fine step when there is no grid to stay on', () => {
      expect(nudgeStep(0, false)).toBe(FINE_NUDGE_STEP);
    });

    it('covers several steps for a shift-arrow', () => {
      expect(nudgeStep(500, true)).toBe(500 * COARSE_NUDGE_FACTOR);
      expect(nudgeStep(0, true)).toBe(FINE_NUDGE_STEP * COARSE_NUDGE_FACTOR);
    });
  });

  describe('edgeSnapOffset', () => {
    const neighbour = { left: 3000, top: 1000, right: 4000, bottom: 2000 };

    it('aligns the nearest pair of edges', () => {
      const bounds = { left: 4100, top: 5000, right: 5100, bottom: 6000 };

      expect(edgeSnapOffset(bounds, [neighbour]).x).toBe(-100);
    });

    it('reports nothing for an axis with no edge in range', () => {
      const bounds = {
        left: 4000 + EDGE_SNAP_TOLERANCE + 1,
        top: 5000,
        right: 6000,
        bottom: 6000,
      };

      expect(edgeSnapOffset(bounds, [neighbour])).toEqual({ x: 0, y: 0 });
    });

    it('snaps to the room walls, which are a neighbour like any other', () => {
      const bounds = { left: 80, top: 3000, right: 2080, bottom: 4000 };

      expect(edgeSnapOffset(bounds, [roomBounds(ROOM)]).x).toBe(-80);
    });
  });

  describe('clampDeltaToRoom', () => {
    it('trims a translation so every centre stays on the floor', () => {
      const items = [
        item({ id: 'a', position: { x: 9000, y: 4000 } }),
        item({ id: 'b', position: { x: 4000, y: 4000 } }),
      ];

      expect(clampDeltaToRoom(items, { x: 5000, y: 0 }, ROOM)).toEqual({
        x: 1000,
        y: 0,
      });
    });

    /*
     * A rigid group. Clamping each centre separately would let the item that
     * hit the wall stop while the rest slid on, rearranging spacing the owner
     * built deliberately.
     */
    it('keeps the spacing of a group that runs into a wall', () => {
      const items = [
        item({ id: 'a', position: { x: 9000, y: 4000 } }),
        item({ id: 'b', position: { x: 4000, y: 4000 } }),
      ];

      const moved = offsetItems(items, { x: 5000, y: 0 }, ROOM);

      expect(moved[0].position.x - moved[1].position.x).toBe(5000);
      expect(moved[0].position.x).toBe(10_000);
    });

    /**
     * Nothing selected is nothing to trim against.
     *
     * The delta comes back untouched rather than zeroed, because the caller is
     * the pan gesture as well as the drag: a viewport move has no items in it,
     * and returning zero here would stop the plan scrolling.
     */
    it('leaves a translation alone when there is nothing to move', () => {
      expect(clampDeltaToRoom([], { x: 5000, y: -200 }, ROOM)).toEqual({
        x: 5000,
        y: -200,
      });
    });
  });

  describe('moveItems', () => {
    const context = {
      room: ROOM,
      spacing: 500,
      neighbours: [] as never[],
    };

    it('lands the dragged item on the grid', () => {
      const [moved] = moveItems(
        [item()],
        'item-1',
        { x: 240, y: -260 },
        context,
      );

      expect(moved.position).toEqual({ x: 5000, y: 3500 });
    });

    it('translates the rest of the selection by the same amount', () => {
      const items = [
        item({ id: 'item-1' }),
        item({ id: 'item-2', position: { x: 1000, y: 1000 } }),
      ];

      const moved = moveItems(items, 'item-1', { x: 740, y: 0 }, context);

      expect(moved[0].position.x).toBe(5500);
      expect(moved[1].position.x).toBe(1500);
    });

    it('prefers a neighbour edge over the grid line it landed on', () => {
      const wall = {
        left: 6620,
        top: 0,
        right: 6720,
        bottom: ROOM.height,
      };

      const [moved] = moveItems(
        [item()],
        'item-1',
        { x: 620, y: 0 },
        {
          ...context,
          neighbours: [wall],
        },
      );

      // Grid-snapped to 5500, whose right edge is 6500; the wall's left edge is
      // 120 mm away, inside the tolerance, so the object goes flush against it.
      expect(itemBounds(moved).right).toBe(wall.left);
    });

    it('never takes a centre off the floor', () => {
      const [moved] = moveItems(
        [item()],
        'item-1',
        { x: 90_000, y: 90_000 },
        context,
      );

      expect(moved.position).toEqual({ x: ROOM.width, y: ROOM.height });
    });

    /** A drag of nothing moves nothing, rather than moving item zero. */
    it('has nothing to drag when the selection is empty', () => {
      expect(moveItems([], 'item-1', { x: 500, y: 500 }, context)).toEqual([]);
    });
  });

  describe('snapSide', () => {
    it('lands on the grid', () => {
      expect(snapSide(1240, 500)).toBe(1000);
    });

    it.each([
      [10, MIN_ITEM_SIDE],
      [900_000, MAX_ITEM_SIDE],
    ])('refuses %p and answers %p', (given, expected) => {
      expect(snapSide(given, 0)).toBe(expected);
    });
  });

  describe('resizeItem', () => {
    const context = { room: ROOM, spacing: 0 };

    it('anchors the opposite edge, so one side grows and the other stays', () => {
      const resized = resizeItem(item(), 'e', { x: 7000, y: 4000 }, context);

      expect(resized.size.width).toBe(3000);
      expect(itemBounds(resized).left).toBe(4000);
    });

    it('grows a rotated item along its own length, not the room axis', () => {
      const turned = item({ rotation: 90 });
      const resized = resizeItem(turned, 'e', { x: 5000, y: 6000 }, context);

      expect(resized.size.width).toBe(3000);
      expect(resized.size.height).toBe(1000);
      closeTo(resized.position.x, 5000);
      closeTo(resized.position.y, 4500);
    });

    it('keeps a round item circular whichever handle is dragged', () => {
      const round = item({
        round: true,
        size: { width: 900, height: 900 },
      });

      const resized = resizeItem(round, 's', { x: 5000, y: 5000 }, context);

      expect(resized.size.width).toBe(resized.size.height);
      expect(resized.size.height).toBe(1450);
    });

    it('snaps the side rather than the dragged edge', () => {
      const resized = resizeItem(
        item(),
        'e',
        { x: 7240, y: 4000 },
        {
          ...context,
          spacing: 500,
        },
      );

      expect(resized.size.width).toBe(3000);
    });

    it('refuses to shrink past the smallest object worth drawing', () => {
      const resized = resizeItem(item(), 'e', { x: 4000, y: 4000 }, context);

      expect(resized.size.width).toBe(MIN_ITEM_SIDE);
    });
  });

  describe('isWithinViewport', () => {
    const viewport = { x: 1000, y: 1000, width: 4000, height: 4000 };

    it('holds a box inside the view', () => {
      expect(
        isWithinViewport(
          itemBounds(item({ position: { x: 3000, y: 3000 } })),
          viewport,
        ),
      ).toBe(true);
    });

    /** Wholly, not partly: a table with a corner showing has its number off the edge. */
    it('refuses a box hanging over the edge', () => {
      expect(
        isWithinViewport(
          itemBounds(item({ position: { x: 1500, y: 3000 } })),
          viewport,
        ),
      ).toBe(false);
    });

    it('refuses a box the view has left behind entirely', () => {
      expect(
        isWithinViewport(
          itemBounds(item({ position: { x: 9000, y: 7000 } })),
          viewport,
        ),
      ).toBe(false);
    });
  });

  describe('rotationTowards', () => {
    it('reads the handle standing straight up as zero', () => {
      expect(rotationTowards({ x: 0, y: 0 }, { x: 0, y: -100 })).toBe(0);
    });

    it.each([
      [{ x: 100, y: 0 }, 90],
      [{ x: 0, y: 100 }, 180],
      [{ x: -100, y: 0 }, 270],
    ])('reads %p as %p degrees clockwise', (pointer, expected) => {
      expect(rotationTowards({ x: 0, y: 0 }, pointer)).toBe(expected);
    });

    it('snaps to the increment it is given', () => {
      expect(rotationTowards({ x: 0, y: 0 }, { x: 100, y: -8 }, 15)).toBe(90);
    });
  });
});
