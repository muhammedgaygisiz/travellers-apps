import { RestaurantTable } from 'model';
import { FloorPlanLayout } from '../floor-plan-layout';
import {
  MAX_TABLE_SEATS,
  MIN_TABLE_SEATS,
  clampSeats,
  labelConflict,
  numberedTables,
  withTableEnabled,
  withTableLabel,
  withTableSeats,
  withTableShapeChanged,
} from '../floor-plan-tables';

const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
  ({
    id: 'table-1',
    label: '1',
    roomId: 'room-1',
    shape: 'rectangle',
    size: { width: 1200, height: 800 },
    position: { x: 1000, y: 1000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

const layoutOf = (tables: RestaurantTable[]): FloorPlanLayout => ({
  objects: [
    {
      id: 'wall-1',
      type: 'wall',
      position: { x: 500, y: 500 },
      size: { width: 2000, height: 100 },
      rotation: 0,
    },
  ],
  tables,
});

describe('table properties', () => {
  describe('the label rule', () => {
    it('accepts a label nothing else holds', () => {
      expect(labelConflict('12', 'table-1', [table()])).toBeUndefined();
    });

    it('accepts a table keeping the label it already has', () => {
      expect(
        labelConflict('1', 'table-1', [table({ id: 'table-1', label: '1' })]),
      ).toBeUndefined();
    });

    /** The acceptance criterion: uniqueness holds across rooms, not per room. */
    it('refuses a label a table in another room already holds', () => {
      const conflict = labelConflict('7', 'table-1', [
        table(),
        table({ id: 'table-9', label: '7', roomId: 'terrace' }),
      ]);

      expect(conflict?.issue).toBe('duplicate');
      expect(conflict?.holder?.roomId).toBe('terrace');
    });

    /**
     * `A1` and `a1` are one table number: staff say them identically and a
     * printed sheet cannot carry the difference.
     */
    it('treats a label that differs only in case or spacing as taken', () => {
      const conflict = labelConflict(' a1 ', 'table-1', [
        table({ id: 'table-2', label: 'A1' }),
      ]);

      expect(conflict?.issue).toBe('duplicate');
      expect(conflict?.label).toBe('a1');
    });

    it('refuses an empty label, because a table nobody can name is not addressable', () => {
      expect(labelConflict('   ', 'table-1', [])?.issue).toBe('empty');
    });
  });

  describe('capacity', () => {
    it.each([
      [0, MIN_TABLE_SEATS],
      [-3, MIN_TABLE_SEATS],
      [4.4, 4],
      [400, MAX_TABLE_SEATS],
    ])('turns %p into %p', (typed, expected) => {
      expect(clampSeats(typed)).toBe(expected);
    });
  });

  describe('editing a table', () => {
    const layout = layoutOf([table(), table({ id: 'table-2', label: '2' })]);

    /**
     * The acceptance criterion of issue #1084 and the mirror of issue #1083's:
     * geometry and identity are edited by different paths and neither touches
     * the other.
     */
    it('changes no geometry when the label, the capacity or the state moves', () => {
      const renamed = withTableLabel(layout, 'table-1', ' 12 ');
      const seated = withTableSeats(renamed, 'table-1', 6);
      const closed = withTableEnabled(seated, 'table-1', false);

      expect(closed.tables[0]).toMatchObject({
        label: '12',
        seats: 6,
        enabled: false,
        position: { x: 1000, y: 1000 },
        rotation: 0,
        size: { width: 1200, height: 800 },
      });
      expect(closed.objects).toBe(layout.objects);
    });

    it('leaves every other table alone', () => {
      const renamed = withTableLabel(layout, 'table-1', '12');

      expect(renamed.tables[1]).toBe(layout.tables[1]);
    });

    it('bounds a typed capacity rather than trusting the field', () => {
      expect(withTableSeats(layout, 'table-1', 0).tables[0].seats).toBe(
        MIN_TABLE_SEATS,
      );
    });

    it('drops the fields of the shape a table leaves', () => {
      const round = withTableShapeChanged(layout, 'table-1', 'round');

      expect(round.tables[0]).toMatchObject({ shape: 'round', diameter: 1200 });
      expect(round.tables[0]).not.toHaveProperty('size');
      expect(round.tables[0].label).toBe('1');
    });
  });

  describe('numbering a selection', () => {
    /** Two rows of two, deliberately out of document order. */
    const grid = layoutOf([
      table({ id: 'd', label: 'x1', position: { x: 3000, y: 3000 } }),
      table({ id: 'b', label: 'x2', position: { x: 3000, y: 1000 } }),
      table({ id: 'c', label: 'x3', position: { x: 1000, y: 3000 } }),
      table({ id: 'a', label: 'x4', position: { x: 1000, y: 1000 } }),
    ]);

    const labelsById = (layout: FloorPlanLayout): Record<string, string> =>
      Object.fromEntries(layout.tables.map((entry) => [entry.id, entry.label]));

    it('numbers in reading order rather than in document order', () => {
      const numbered = numberedTables(grid, ['a', 'b', 'c', 'd'], 1);

      expect(labelsById(numbered)).toEqual({
        a: '1',
        b: '2',
        c: '3',
        d: '4',
      });
    });

    it('starts where the owner asked', () => {
      const numbered = numberedTables(grid, ['a', 'b'], 10);

      expect(labelsById(numbered)).toMatchObject({ a: '10', b: '11' });
    });

    it('groups tables nudged a few centimetres apart into one row', () => {
      const wonky = layoutOf([
        table({ id: 'left', label: 'x', position: { x: 1000, y: 1040 } }),
        table({ id: 'right', label: 'y', position: { x: 3000, y: 960 } }),
      ]);

      expect(labelsById(numberedTables(wonky, ['left', 'right'], 1))).toEqual({
        left: '1',
        right: '2',
      });
    });

    /** The helper must not create the collision the label rule refuses. */
    it('skips numbers held by tables outside the selection', () => {
      const numbered = numberedTables(grid, ['a', 'b'], 1, ['1']);

      expect(labelsById(numbered)).toMatchObject({ a: '2', b: '3' });
    });

    it('skips a number held by a table in the same room that is not selected', () => {
      const withThree = layoutOf([
        ...grid.tables,
        table({ id: 'kept', label: '2', position: { x: 5000, y: 5000 } }),
      ]);

      const numbered = numberedTables(withThree, ['a', 'b'], 1);

      expect(labelsById(numbered)).toMatchObject({ a: '1', b: '3', kept: '2' });
    });

    it('moves nothing', () => {
      const numbered = numberedTables(grid, ['a', 'b', 'c', 'd'], 1);

      numbered.tables.forEach((entry, index) => {
        expect(entry.position).toEqual(grid.tables[index].position);
      });
    });

    it('leaves the layout alone when no table is selected', () => {
      expect(numberedTables(grid, ['wall-1'], 1)).toBe(grid);
    });
  });
});
