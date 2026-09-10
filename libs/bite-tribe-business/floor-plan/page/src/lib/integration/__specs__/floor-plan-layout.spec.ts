import {
  DEFAULT_TABLE_SEATS,
  FloorPlanItem,
  FloorPlanPaletteEntry,
  paletteEntry,
} from 'bite-tribe-business/floor-plan-ui';
import { FloorPlanObject, FloorPlanSize, RestaurantTable, Room } from 'model';
import {
  FloorPlanLayout,
  duplicateIds,
  layoutChanged,
  layoutIds,
  layoutOf,
  nextTableLabel,
  placeEntry,
  tableWrites,
  withItemGeometry,
  withoutIds,
} from '../floor-plan-layout';

const wall: FloorPlanObject = {
  id: 'wall-1',
  type: 'wall',
  position: { x: 1000, y: 1000 },
  size: { width: 2000, height: 100 },
  rotation: 0,
};

const table = (over: Partial<RestaurantTable> = {}): RestaurantTable =>
  ({
    id: 'table-1',
    label: '1',
    roomId: 'room-1',
    shape: 'rectangle',
    size: { width: 1200, height: 800 },
    position: { x: 3000, y: 3000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

const ROOM: FloorPlanSize = { width: 8000, height: 12_000 };

const layout = (over: Partial<FloorPlanLayout> = {}): FloorPlanLayout => ({
  objects: [wall],
  tables: [table()],
  ...over,
});

const entry = (variant: string): FloorPlanPaletteEntry => {
  const found = paletteEntry(variant);

  if (!found) {
    throw new Error(`no palette entry for ${variant}`);
  }

  return found;
};

describe('the floor plan layout', () => {
  describe('layoutOf', () => {
    it('takes the geometry off the room and the tables from beside it', () => {
      const room = { objects: [wall] } as Room;

      expect(layoutOf(room, [table()])).toEqual({
        objects: [wall],
        tables: [table()],
      });
    });

    it('copies the arrays, so editing cannot reach the loaded room', () => {
      const room = { objects: [wall] } as Room;
      const copied = layoutOf(room, []);

      copied.objects.push({ ...wall, id: 'wall-2' });

      expect(room.objects).toHaveLength(1);
    });

    it('is empty without a room', () => {
      expect(layoutOf(undefined, [])).toEqual({ objects: [], tables: [] });
    });
  });

  describe('nextTableLabel', () => {
    it('starts at one', () => {
      expect(nextTableLabel([])).toBe('1');
    });

    /**
     * The smallest unused number rather than one past the count, so deleting
     * table 3 of five and placing another gives 3 back instead of a second 5.
     */
    it('fills the gap a deleted table left', () => {
      const tables = ['1', '2', '4', '5'].map((label) =>
        table({ id: label, label }),
      );

      expect(nextTableLabel(tables)).toBe('3');
    });
  });

  describe('placeEntry', () => {
    it('adds geometry as an object of the palette entry type', () => {
      const placed = placeEntry(
        layout(),
        entry('chair'),
        { x: 500, y: 600 },
        'room-1',
      );

      expect(placed.layout.objects).toHaveLength(2);
      expect(placed.layout.tables).toHaveLength(1);
      expect(placed.layout.objects[1]).toMatchObject({
        id: placed.id,
        type: 'chair',
        position: { x: 500, y: 600 },
        rotation: 0,
      });
    });

    /**
     * The acceptance criterion that placing a table writes a table document.
     * It arrives complete enough to store: a label nothing in the room shares,
     * a capacity, and the room it stands in.
     */
    it('adds a table as a business entity with a label and a capacity', () => {
      const placed = placeEntry(
        layout(),
        entry('table-round'),
        { x: 500, y: 600 },
        'room-1',
      );

      expect(placed.layout.objects).toHaveLength(1);
      expect(placed.layout.tables[1]).toMatchObject({
        id: placed.id,
        shape: 'round',
        diameter: 900,
        label: '2',
        roomId: 'room-1',
        seats: DEFAULT_TABLE_SEATS,
        enabled: true,
      });
    });

    it('gives a rectangular table a size rather than a diameter', () => {
      const placed = placeEntry(
        { objects: [], tables: [] },
        entry('table-rectangle'),
        { x: 0, y: 0 },
        'room-1',
      );

      expect(placed.layout.tables[0]).toMatchObject({
        shape: 'rectangle',
        size: { width: 1200, height: 800 },
      });
      expect(placed.layout.tables[0]).not.toHaveProperty('diameter');
    });
  });

  describe('withItemGeometry', () => {
    const moved = (over: Partial<FloorPlanItem>): FloorPlanItem => ({
      id: 'table-1',
      kind: 'table',
      variant: 'table-rectangle',
      position: { x: 9, y: 9 },
      size: { width: 1200, height: 800 },
      rotation: 0,
      round: false,
      ...over,
    });

    it('moves only the ids a gesture touched', () => {
      const next = withItemGeometry(layout(), [moved({ rotation: 90 })]);

      expect(next.tables[0].rotation).toBe(90);
      expect(next.objects[0]).toBe(wall);
    });

    it('cannot lose a table property by moving the table', () => {
      const next = withItemGeometry(layout(), [moved({ rotation: 90 })]);

      expect(next.tables[0]).toMatchObject({
        label: '1',
        seats: 4,
        enabled: true,
      });
    });
  });

  describe('withoutIds', () => {
    it('removes from both halves at once', () => {
      expect(withoutIds(layout(), ['wall-1', 'table-1'])).toEqual({
        objects: [],
        tables: [],
      });
    });

    it('leaves what it was not asked to remove', () => {
      expect(withoutIds(layout(), ['nothing'])).toEqual(layout());
    });
  });

  describe('duplicateIds', () => {
    /**
     * The acceptance criterion about duplicate: n items in one action, offset
     * rather than hidden underneath the originals.
     */
    it('copies every chosen item once, beside its original', () => {
      const source = layout({
        tables: [
          table({ id: 'table-1', label: '1' }),
          table({ id: 'table-2', label: '2', position: { x: 5000, y: 3000 } }),
        ],
      });

      const copied = duplicateIds(
        source,
        ['table-1', 'table-2', 'wall-1'],
        { x: 500, y: 500 },
        ROOM,
      );

      expect(copied.ids).toHaveLength(3);
      expect(copied.layout.tables).toHaveLength(4);
      expect(copied.layout.objects).toHaveLength(2);
      expect(copied.layout.tables[2].position).toEqual({ x: 3500, y: 3500 });
    });

    it('gives every copy an identity of its own', () => {
      const copied = duplicateIds(
        layout(),
        ['table-1', 'wall-1'],
        { x: 0, y: 0 },
        ROOM,
      );

      expect(new Set(layoutIds(copied.layout)).size).toBe(4);
    });

    /** A table already against the far wall duplicates on to it, not off the plan. */
    it('keeps every copy inside the room', () => {
      const copied = duplicateIds(
        layout({ tables: [table({ position: { x: 8000, y: 12_000 } })] }),
        ['table-1'],
        { x: 500, y: 500 },
        ROOM,
      );

      expect(copied.layout.tables[1].position).toEqual({ x: 8000, y: 12_000 });
    });

    /** Two tables called 7 is the conflict the owner would then have to hunt for. */
    it('numbers duplicated tables rather than repeating the label', () => {
      const copied = duplicateIds(
        layout({ tables: [table(), table({ id: 'table-2', label: '2' })] }),
        ['table-1', 'table-2'],
        { x: 0, y: 0 },
        ROOM,
      );

      expect(copied.layout.tables.map((entry) => entry.label)).toEqual([
        '1',
        '2',
        '3',
        '4',
      ]);
    });
  });

  describe('tableWrites', () => {
    it('writes nothing when nothing changed', () => {
      expect(tableWrites([table()], [table()])).toEqual({
        changed: [],
        deleted: [],
      });
    });

    /**
     * Field by field rather than by serialising: a table read from Firestore
     * and one built in the editor carry the same fields in a different order,
     * and a string comparison would report every table as changed every time.
     */
    it('is not fooled by a different key order', () => {
      const stored = {
        enabled: true,
        seats: 4,
        rotation: 0,
        position: { x: 3000, y: 3000 },
        size: { width: 1200, height: 800 },
        shape: 'rectangle',
        roomId: 'room-1',
        label: '1',
        id: 'table-1',
      } as RestaurantTable;

      expect(tableWrites([stored], [table()]).changed).toEqual([]);
    });

    it('writes a moved table and a new one', () => {
      const { changed } = tableWrites(
        [table()],
        [
          table({ position: { x: 4000, y: 3000 } }),
          table({ id: 'table-2', label: '2' }),
        ],
      );

      expect(changed.map((entry) => entry.id)).toEqual(['table-1', 'table-2']);
    });

    it('names the tables the owner removed', () => {
      expect(tableWrites([table()], []).deleted).toEqual(['table-1']);
    });
  });

  describe('layoutChanged', () => {
    it('is quiet for a plan nobody edited', () => {
      expect(layoutChanged(layout(), layout())).toBe(false);
    });

    it.each([
      [
        'a moved object',
        layout({ objects: [{ ...wall, position: { x: 0, y: 0 } }] }),
      ],
      ['a placed object', layout({ objects: [wall, { ...wall, id: 'w2' }] })],
      ['a deleted object', layout({ objects: [] })],
      ['a moved table', layout({ tables: [table({ rotation: 90 })] })],
      ['a deleted table', layout({ tables: [] })],
    ])('notices %s', (_what, edited) => {
      expect(layoutChanged(layout(), edited)).toBe(true);
    });
  });
});
