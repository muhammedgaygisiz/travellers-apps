import type {
  FloorPlanObject,
  Millimetres,
  RectangularTable,
  RestaurantTable,
  Room,
  RoundTable,
} from '../../index';

/**
 * The floor-plan model is types only, so these are compile-time assertions
 * that happen to run: `ts-jest` type-checks this file, and a shape the model
 * can no longer express fails to compile before any expectation is evaluated.
 *
 * What is worth asserting is that the model describes a real dining room
 * without borrowing anything from a renderer, so the cases below are the five
 * shapes issue #1080 requires plus the field contract of a table.
 */
describe('floor plan model', () => {
  const roundTable: RoundTable = {
    id: 'table-4',
    label: '4',
    roomId: 'main',
    shape: 'round',
    diameter: 900,
    position: { x: 2400, y: 1800 },
    rotation: 0,
    seats: 4,
    enabled: true,
  };

  const rectangularTable: RectangularTable = {
    id: 'table-12',
    label: '12',
    roomId: 'main',
    shape: 'rectangle',
    size: { width: 1600, height: 800 },
    position: { x: 5200, y: 1200 },
    rotation: 0,
    seats: 6,
    enabled: true,
    qrTokenId: 'tok_r7Kq2mXbN4',
  };

  const rotatedBanquetteTable: RectangularTable = {
    ...rectangularTable,
    id: 'table-13',
    label: '13',
    rotation: 270,
  };

  const banquetteBench: FloorPlanObject = {
    id: 'bench-1',
    type: 'chair',
    label: 'Banquette',
    position: { x: 5200, y: 700 },
    size: { width: 1800, height: 450 },
    rotation: 270,
  };

  const wallSegment: FloorPlanObject = {
    id: 'wall-north',
    type: 'wall',
    position: { x: 4000, y: 50 },
    size: { width: 8000, height: 100 },
    rotation: 0,
  };

  const blockedArea: FloorPlanObject = {
    id: 'pillar-1',
    type: 'blocked',
    label: 'Pillar',
    position: { x: 3600, y: 2600 },
    size: { width: 400, height: 400 },
    rotation: 0,
  };

  it('describes a round table by diameter and a rectangular one by size', () => {
    expect(roundTable.diameter).toBe(900);
    expect(rectangularTable.size).toEqual({ width: 1600, height: 800 });
  });

  it('rotates a banquette table and its bench about their own centre', () => {
    expect(rotatedBanquetteTable.rotation).toBe(270);
    expect(banquetteBench.rotation).toBe(270);
    expect(rotatedBanquetteTable.position).toEqual(rectangularTable.position);
  });

  it('expresses a wall segment and a blocked area as geometry', () => {
    expect(wallSegment.type).toBe('wall');
    expect(blockedArea.type).toBe('blocked');
  });

  it('keeps seating capacity on the table and not on the chair geometry', () => {
    expect(rectangularTable.seats).toBe(6);
    expect(banquetteBench).not.toHaveProperty('seats');
  });

  it('describes a table without any reference to a rendering surface', () => {
    expect(Object.keys(rectangularTable).sort()).toEqual([
      'enabled',
      'id',
      'label',
      'position',
      'qrTokenId',
      'roomId',
      'rotation',
      'seats',
      'shape',
      'size',
    ]);
  });

  it('holds geometry in the room and tables outside it', () => {
    const room: Room = {
      id: 'main',
      name: 'Main dining room',
      order: 0,
      size: { width: 8000, height: 5000 },
      objects: [wallSegment, banquetteBench, blockedArea],
      version: 3,
    };

    expect(room.objects.map((object) => object.type)).toEqual([
      'wall',
      'chair',
      'blocked',
    ]);
    expect(room).not.toHaveProperty('tables');
  });

  /**
   * The level a room sits on (GitHub issue #1085).
   *
   * Optional, so a restaurant on one floor describes its rooms without it, and
   * a name rather than a number because a restaurant says `Terrace level` as
   * readily as it says `1`.
   */
  it('lets a room name the level it sits on, and lets it name none', () => {
    const ground: Room = {
      id: 'main',
      name: 'Main dining room',
      order: 0,
      floor: 'Ground floor',
      size: { width: 8000, height: 5000 },
      objects: [],
      version: 1,
    };
    const terrace: Room = { ...ground, id: 'terrace', name: 'Terrace' };

    delete terrace.floor;

    expect(ground.floor).toBe('Ground floor');
    expect(terrace).not.toHaveProperty('floor');
  });

  it('narrows a table by its shape discriminant', () => {
    const widthOf = (table: RestaurantTable): Millimetres =>
      table.shape === 'round' ? table.diameter : table.size.width;

    expect(widthOf(roundTable)).toBe(900);
    expect(widthOf(rectangularTable)).toBe(1600);
  });
});
