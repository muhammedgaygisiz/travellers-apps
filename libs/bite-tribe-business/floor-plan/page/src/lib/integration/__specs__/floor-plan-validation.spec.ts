import { RestaurantTable, Room } from 'model';
import { FloorPlanLayout } from '../floor-plan-layout';
import {
  FloorPlanIssueCode,
  FloorPlanValidation,
  validateFloorPlan,
} from '../floor-plan-validation';

const room = (over: Partial<Room> = {}): Room => ({
  id: 'room-1',
  name: 'Main dining room',
  order: 0,
  size: { width: 8000, height: 12_000 },
  objects: [],
  version: 1,
  ...over,
});

const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
  ({
    id: 'table-1',
    label: '1',
    roomId: 'room-1',
    shape: 'rectangle',
    size: { width: 1000, height: 1000 },
    position: { x: 2000, y: 2000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

const layout = (tables: RestaurantTable[]): FloorPlanLayout => ({
  objects: [],
  tables,
});

const check = (
  tables: RestaurantTable[],
  options: { room?: Room; otherTables?: RestaurantTable[] } = {},
): FloorPlanValidation =>
  validateFloorPlan({
    room: options.room ?? room(),
    layout: layout(tables),
    otherTables: options.otherTables ?? [],
  });

const codes = (issues: { code: FloorPlanIssueCode }[]): FloorPlanIssueCode[] =>
  issues.map((issue) => issue.code);

describe('validateFloorPlan', () => {
  it('passes a plan with nothing wrong with it', () => {
    const result = check([
      table(),
      table({ id: 'table-2', label: '2', position: { x: 5000, y: 5000 } }),
    ]);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.publishable).toBe(true);
  });

  it('passes an empty room, which is a room nobody has furnished yet', () => {
    expect(check([]).publishable).toBe(true);
  });

  describe('the table number', () => {
    it('refuses a table with no number at all', () => {
      const result = check([table({ label: '  ' })]);

      expect(codes(result.errors)).toEqual(['label-empty']);
      expect(result.publishable).toBe(false);
    });

    /**
     * The editor refuses a duplicate as it is typed, so this catches the plans
     * that reached the state some other way - a second device arranging a
     * second room, or a draft written before the rule existed.
     */
    it('refuses two tables carrying one number', () => {
      const result = check([
        table(),
        table({ id: 'table-2', position: { x: 6000, y: 6000 } }),
      ]);

      expect(codes(result.errors)).toEqual(['label-duplicate']);
      expect(result.errors[0].tableId).toBe('table-2');
      expect(result.errors[0].otherTableId).toBe('table-1');
    });

    it('refuses a number another room already holds, and names that room', () => {
      const result = check([table({ label: '7' })], {
        otherTables: [
          table({ id: 'terrace-7', label: '7', roomId: 'terrace' }),
        ],
      });

      expect(codes(result.errors)).toEqual(['label-duplicate']);
      expect(result.errors[0].otherRoomId).toBe('terrace');
    });

    /** Staff say `A1` and `a1` identically, and a printed sheet cannot carry
     * the difference, so accepting both would produce the collision invisibly. */
    it('treats case and surrounding spaces as one number', () => {
      const result = check([
        table({ label: 'A1' }),
        table({ id: 'table-2', label: ' a1 ', position: { x: 6000, y: 6000 } }),
      ]);

      expect(codes(result.errors)).toEqual(['label-duplicate']);
    });

    /** The finding lands on the table in the open room, which is the one the
     * owner can act on: the other one is in a room they are not looking at. */
    it('reports the collision on the table the owner is editing', () => {
      const result = check([table({ label: '7' })], {
        otherTables: [
          table({ id: 'terrace-7', label: '7', roomId: 'terrace' }),
        ],
      });

      expect(result.errors[0].tableId).toBe('table-1');
    });

    it('leaves a collision between two other rooms alone', () => {
      const result = check([], {
        otherTables: [
          table({ id: 'a', label: '7', roomId: 'terrace' }),
          table({ id: 'b', label: '7', roomId: 'gallery' }),
        ],
      });

      expect(result.errors).toEqual([]);
    });
  });

  describe('the capacity', () => {
    it('refuses a table nobody can sit at', () => {
      expect(codes(check([table({ seats: 0 })]).errors)).toEqual([
        'seats-too-few',
      ]);
    });

    it('accepts a table for one', () => {
      expect(check([table({ seats: 1 })].map((t) => t)).publishable).toBe(true);
    });

    /** A disabled table is still a real place in the room and still needs a
     * capacity: it is out of service, not a decoration. */
    it('checks a table that is out of service too', () => {
      expect(
        codes(check([table({ seats: 0, enabled: false })]).errors),
      ).toEqual(['seats-too-few']);
    });
  });

  describe('where the table stands', () => {
    /**
     * The case this rule exists for: resizing a room moves nothing standing in
     * it, so shrinking a hall leaves tables beyond the new wall.
     */
    it('refuses a table whose centre is outside the room', () => {
      const result = check([table({ position: { x: 9000, y: 2000 } })]);

      expect(codes(result.errors)).toEqual(['table-outside-room']);
      expect(result.publishable).toBe(false);
    });

    it('refuses a table at a negative coordinate', () => {
      expect(
        codes(check([table({ position: { x: -10, y: 2000 } })]).errors),
      ).toEqual(['table-outside-room']);
    });

    /**
     * A table against a wall overhangs the outline, and that is a warning
     * rather than a refusal - the same rule the editor's own clamp follows,
     * where a shape whose centre is on the floor is on the floor.
     */
    it('warns about a table that sticks out past the outline', () => {
      const result = check([table({ position: { x: 100, y: 2000 } })]);

      expect(result.errors).toEqual([]);
      expect(codes(result.warnings)).toEqual(['table-overhangs-room']);
      expect(result.publishable).toBe(true);
    });
  });

  describe('tables on top of each other', () => {
    /** The acceptance criterion: overlapping tables warn and do not block,
     * because real rooms have tables pushed together for a party of ten. */
    it('warns rather than blocking', () => {
      const result = check([
        table(),
        table({ id: 'table-2', label: '2', position: { x: 2500, y: 2000 } }),
      ]);

      expect(codes(result.warnings)).toEqual(['tables-overlap']);
      expect(result.publishable).toBe(true);
      expect(result.warnings[0].otherTableId).toBe('table-1');
    });

    /** A row of tables pushed flush together is a deliberate arrangement, and
     * warning about it would train the owner to ignore the warnings. */
    it('says nothing about tables that only touch', () => {
      const result = check([
        table(),
        table({ id: 'table-2', label: '2', position: { x: 3000, y: 2000 } }),
      ]);

      expect(result.warnings).toEqual([]);
    });

    it('reports one finding per table however many it sits on', () => {
      const result = check([
        table(),
        table({ id: 'table-2', label: '2', position: { x: 2200, y: 2000 } }),
        table({ id: 'table-3', label: '3', position: { x: 2400, y: 2000 } }),
      ]);

      expect(result.warnings).toHaveLength(2);
    });

    it('leaves a table in another room out of the comparison', () => {
      const result = check([table()], {
        otherTables: [
          table({ id: 'terrace-1', label: '9', roomId: 'terrace' }),
        ],
      });

      expect(result.warnings).toEqual([]);
    });
  });

  /**
   * Geometry is not validated. A wall half outside the room is a wall of the
   * room, and nothing downstream reads geometry closely enough for a bad one
   * to break it.
   */
  it('says nothing about the geometry', () => {
    const result = validateFloorPlan({
      room: room(),
      layout: {
        objects: [
          {
            id: 'wall-1',
            type: 'wall',
            position: { x: 20_000, y: 20_000 },
            size: { width: 3000, height: 100 },
            rotation: 0,
          },
        ],
        tables: [],
      },
      otherTables: [],
    });

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
