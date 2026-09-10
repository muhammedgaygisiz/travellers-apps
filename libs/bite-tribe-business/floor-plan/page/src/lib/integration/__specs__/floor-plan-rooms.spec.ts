import { RestaurantTable, Room } from 'model';
import {
  capacityByRoom,
  capacityOf,
  floorGroups,
  hasFloors,
  reorderWrites,
  reorderedRooms,
  restaurantCapacity,
} from '../floor-plan-rooms';

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
    size: { width: 1200, height: 800 },
    position: { x: 1000, y: 1000 },
    rotation: 0,
    seats: 4,
    enabled: true,
    ...over,
  }) as RestaurantTable;

const names = (rooms: readonly Room[]): string[] =>
  rooms.map((candidate) => candidate.name);

describe('floor plan rooms', () => {
  describe('capacity', () => {
    it('counts every table and seats only the ones in service', () => {
      expect(
        capacityOf([
          table({ id: 'a', seats: 4 }),
          table({ id: 'b', seats: 2 }),
          table({ id: 'c', seats: 6, enabled: false }),
        ]),
      ).toEqual({ tables: 3, seats: 6, disabled: 1 });
    });

    it('reports an empty room rather than leaving it out', () => {
      const capacities = capacityByRoom(
        [room(), room({ id: 'room-2', name: 'Terrace' })],
        [table({ seats: 4 })],
      );

      expect(capacities['room-1']).toEqual({
        tables: 1,
        seats: 4,
        disabled: 0,
      });
      expect(capacities['room-2']).toEqual({
        tables: 0,
        seats: 0,
        disabled: 0,
      });
    });

    /**
     * A table naming a room that is not in the list.
     *
     * Not a state the editor produces, and the summary is what an owner reads
     * their restaurant's capacity off - so a table left over from a room that
     * is gone must not appear in a total no room accounts for.
     */
    it('ignores a table whose room is not there', () => {
      const total = restaurantCapacity(
        [room()],
        [
          table({ seats: 4 }),
          table({ id: 'orphan', roomId: 'gone', seats: 8 }),
        ],
      );

      expect(total).toEqual({ rooms: 1, tables: 1, seats: 4, disabled: 0 });
    });

    it('sums the whole restaurant across its rooms', () => {
      const total = restaurantCapacity(
        [room(), room({ id: 'room-2', name: 'Terrace' })],
        [
          table({ id: 'a', seats: 4 }),
          table({ id: 'b', roomId: 'room-2', seats: 2 }),
          table({ id: 'c', roomId: 'room-2', seats: 6, enabled: false }),
        ],
      );

      expect(total).toEqual({ rooms: 2, tables: 3, seats: 6, disabled: 1 });
    });
  });

  describe('grouping by floor', () => {
    it('leaves a restaurant that names no floor as one group', () => {
      const rooms = [room(), room({ id: 'room-2', name: 'Terrace' })];

      expect(hasFloors(rooms)).toBe(false);
      expect(floorGroups(rooms)).toEqual([{ floor: undefined, rooms }]);
    });

    /**
     * A group is shown where its first room already stood.
     *
     * Sorting by floor instead would move a room the moment its level was
     * named, which is a plan reshuffling itself under an owner who only typed
     * a word into a field.
     */
    it('keeps the order the rooms were already in', () => {
      const groups = floorGroups([
        room({ name: 'Bar', floor: 'Ground floor' }),
        room({ id: 'room-2', name: 'Gallery', floor: 'Upstairs' }),
        room({ id: 'room-3', name: 'Snug', floor: 'Ground floor' }),
      ]);

      expect(groups.map((group) => group.floor)).toEqual([
        'Ground floor',
        'Upstairs',
      ]);
      expect(names(groups[0].rooms)).toEqual(['Bar', 'Snug']);
      expect(names(groups[1].rooms)).toEqual(['Gallery']);
    });

    it('treats a blank floor as no floor at all', () => {
      const groups = floorGroups([
        room({ name: 'Bar', floor: '  ' }),
        room({ id: 'room-2', name: 'Gallery', floor: 'Upstairs' }),
      ]);

      expect(groups[0].floor).toBeUndefined();
      expect(hasFloors([room({ floor: '   ' })])).toBe(false);
    });
  });

  describe('reordering', () => {
    const three = [
      room({ id: 'room-1', name: 'Bar', order: 0 }),
      room({ id: 'room-2', name: 'Gallery', order: 1 }),
      room({ id: 'room-3', name: 'Snug', order: 2 }),
    ];

    it('moves a room up and renumbers from the top', () => {
      const moved = reorderedRooms(three, 'room-3', -1);

      expect(names(moved)).toEqual(['Bar', 'Snug', 'Gallery']);
      expect(moved.map((candidate) => candidate.order)).toEqual([0, 1, 2]);
    });

    it('moves a room down', () => {
      expect(names(reorderedRooms(three, 'room-1', 1))).toEqual([
        'Gallery',
        'Bar',
        'Snug',
      ]);
    });

    it('refuses to move the first room up or the last one down', () => {
      expect(names(reorderedRooms(three, 'room-1', -1))).toEqual(names(three));
      expect(names(reorderedRooms(three, 'room-3', 1))).toEqual(names(three));
      expect(names(reorderedRooms(three, 'nobody', -1))).toEqual(names(three));
    });

    /**
     * Stored orders that collide, which no reload can sort the same way twice.
     *
     * Renumbering from the position rather than swapping two values is what
     * heals them, so the acceptance criterion "room order is stable across
     * reloads" survives data that was never in a stable order.
     */
    it('heals orders that collide or leave gaps', () => {
      const messy = [
        room({ id: 'room-1', name: 'Bar', order: 5 }),
        room({ id: 'room-2', name: 'Gallery', order: 5 }),
        room({ id: 'room-3', name: 'Snug', order: 9 }),
      ];

      expect(
        reorderedRooms(messy, 'room-3', -1).map((candidate) => candidate.order),
      ).toEqual([0, 1, 2]);
    });

    it('writes only the rooms whose stored order actually moved', () => {
      const writes = reorderWrites(three, reorderedRooms(three, 'room-3', -1));

      expect(names(writes)).toEqual(['Snug', 'Gallery']);
    });

    it('writes nothing when the move changes no position', () => {
      expect(reorderWrites(three, reorderedRooms(three, 'room-1', -1))).toEqual(
        [],
      );
    });
  });
});
