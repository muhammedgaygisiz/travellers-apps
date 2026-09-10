import { FloorPlanObject, RestaurantTable } from 'model';
import {
  FloorPlanItem,
  isTableVariant,
  itemFromObject,
  itemFromTable,
  objectWithItemGeometry,
  tableShapeOf,
  tableWithItemGeometry,
  tableWithShape,
} from '../floor-plan-item';

const wall: FloorPlanObject = {
  id: 'wall-1',
  type: 'wall',
  position: { x: 1000, y: 2000 },
  size: { width: 3000, height: 100 },
  rotation: 30,
  label: 'Back wall',
};

const roundTable: RestaurantTable = {
  id: 'table-1',
  label: '7',
  roomId: 'room-1',
  shape: 'round',
  diameter: 900,
  position: { x: 4000, y: 5000 },
  rotation: 0,
  seats: 4,
  enabled: true,
};

const rectangularTable: RestaurantTable = {
  id: 'table-2',
  label: '8',
  roomId: 'room-1',
  shape: 'rectangle',
  size: { width: 1200, height: 800 },
  position: { x: 2000, y: 3000 },
  rotation: 90,
  seats: 4,
  enabled: false,
  qrTokenId: 'token-1',
};

const geometry = (over: Partial<FloorPlanItem>): FloorPlanItem => ({
  id: 'ignored',
  kind: 'object',
  variant: 'wall',
  position: { x: 0, y: 0 },
  size: { width: 100, height: 100 },
  rotation: 0,
  round: false,
  ...over,
});

describe('floor plan items', () => {
  describe('variants', () => {
    it.each([
      ['table-rectangle', 'rectangle'],
      ['table-round', 'round'],
    ])('reads %p as the %p table shape', (variant, shape) => {
      expect(tableShapeOf(variant as FloorPlanItem['variant'])).toBe(shape);
      expect(isTableVariant(variant as FloorPlanItem['variant'])).toBe(true);
    });

    it.each(['wall', 'door', 'chair', 'blocked'])(
      'reads %p as geometry rather than a table',
      (variant) => {
        expect(
          tableShapeOf(variant as FloorPlanItem['variant']),
        ).toBeUndefined();
        expect(isTableVariant(variant as FloorPlanItem['variant'])).toBe(false);
      },
    );
  });

  describe('reading a plan', () => {
    it('draws an object by its type', () => {
      expect(itemFromObject(wall)).toEqual({
        id: 'wall-1',
        kind: 'object',
        variant: 'wall',
        position: wall.position,
        size: wall.size,
        rotation: 30,
        label: 'Back wall',
        round: false,
      });
    });

    /*
     * The diameter becomes a square box on both axes, so nothing downstream
     * needs a special case for a circle in its bounds, its snapping or its
     * resize maths.
     */
    it('gives a round table a square box of its diameter', () => {
      const item = itemFromTable(roundTable);

      expect(item.size).toEqual({ width: 900, height: 900 });
      expect(item.round).toBe(true);
      expect(item.variant).toBe('table-round');
    });

    it('keeps a rectangular table rectangular', () => {
      const item = itemFromTable(rectangularTable);

      expect(item.size).toEqual({ width: 1200, height: 800 });
      expect(item.round).toBe(false);
      expect(item.label).toBe('8');
    });
  });

  describe('writing geometry back', () => {
    it('moves the four geometry fields of an object and nothing else', () => {
      const moved = objectWithItemGeometry(
        wall,
        geometry({
          position: { x: 500, y: 600 },
          size: { width: 4000, height: 200 },
          rotation: 45,
        }),
      );

      expect(moved).toEqual({
        ...wall,
        position: { x: 500, y: 600 },
        size: { width: 4000, height: 200 },
        rotation: 45,
      });
    });

    /*
     * The point of writing the fields back rather than spreading an item over a
     * table: a drag must not be able to lose a label, a capacity, an enabled
     * state or a printed QR token.
     */
    it('cannot lose a table property by dragging the table', () => {
      const moved = tableWithItemGeometry(
        rectangularTable,
        geometry({ position: { x: 9, y: 9 }, rotation: 12 }),
      );

      expect(moved.label).toBe('8');
      expect(moved.seats).toBe(4);
      expect(moved.enabled).toBe(false);
      expect(moved.qrTokenId).toBe('token-1');
    });

    it('takes a round table diameter from the width alone', () => {
      const resized = tableWithItemGeometry(
        roundTable,
        geometry({ size: { width: 1200, height: 1200 }, round: true }),
      );

      expect(resized).toMatchObject({ shape: 'round', diameter: 1200 });
      expect(resized).not.toHaveProperty('size');
    });
  });

  describe('the shape a table is drawn as', () => {
    it('carries the seating capacity and the service state on to the item', () => {
      const item = itemFromTable(rectangularTable);

      expect(item.seats).toBe(4);
      expect(item.enabled).toBe(false);
    });

    it('leaves geometry with no capacity and no service state', () => {
      const item = itemFromObject(wall);

      expect(item.seats).toBeUndefined();
      expect(item.enabled).toBeUndefined();
    });

    it('turns a rectangle into a round table of its width', () => {
      const round = tableWithShape(rectangularTable, 'round');

      expect(round).toMatchObject({ shape: 'round', diameter: 1200 });
      expect(round).not.toHaveProperty('size');
    });

    it('turns a round table into the square it was drawn in', () => {
      const rectangle = tableWithShape(roundTable, 'rectangle');

      expect(rectangle).toMatchObject({
        shape: 'rectangle',
        size: { width: 900, height: 900 },
      });
      expect(rectangle).not.toHaveProperty('diameter');
    });

    /** A shape change is the drawing, so the business entity has to survive it. */
    it('keeps the identity, the label, the capacity and the token', () => {
      const round = tableWithShape(rectangularTable, 'round');

      expect(round).toMatchObject({
        id: 'table-2',
        label: '8',
        roomId: 'room-1',
        seats: 4,
        enabled: false,
        qrTokenId: 'token-1',
        position: { x: 2000, y: 3000 },
        rotation: 90,
      });
    });

    it('leaves a table that is already the asked-for shape alone', () => {
      expect(tableWithShape(roundTable, 'round')).toBe(roundTable);
    });
  });
});
