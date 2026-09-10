import { RestaurantTable, Room } from 'model';

/**
 * What a restaurant of several rooms needs beyond one room at a time
 * (GitHub issue #1085).
 *
 * Everything here is a pure function over the rooms and tables the editor
 * already holds, for the same reason the layout and table helpers are: the
 * rules can be asserted without rendering a canvas or reading Firestore.
 *
 * ## Order and floor are two different things
 *
 * `Room.order` is the position of a room among the rooms of the restaurant, and
 * it is the only thing that decides what comes before what. `Room.floor` is an
 * optional level name, and it groups rooms for display without reordering them:
 * a group is shown where its first room already stood, so naming a floor never
 * reshuffles a plan the owner arranged, and clearing one never does either.
 *
 * That is why {@link floorGroups} groups a list that is *already* in order
 * instead of sorting by floor. A restaurant that types `Ground floor` on one
 * room and nothing on the next would otherwise watch its rooms jump.
 */

/** How much seating one room, or one restaurant, actually offers. */
export interface RoomCapacity {
  /** Every table in the room, in service or not. */
  tables: number;
  /**
   * Seats across the tables that are in service.
   *
   * Disabled tables are left out because the number answers "how many guests
   * can sit here", and a table taken out of service seats nobody ([[Table]]).
   * They are still counted in {@link tables} and reported separately by
   * {@link disabled}, so the two numbers disagreeing has a visible reason.
   */
  seats: number;
  /** How many of those tables are out of service. */
  disabled: number;
}

export const EMPTY_CAPACITY: RoomCapacity = {
  tables: 0,
  seats: 0,
  disabled: 0,
};

/** The capacity of one set of tables. */
export const capacityOf = (tables: readonly RestaurantTable[]): RoomCapacity =>
  tables.reduce<RoomCapacity>(
    (total, table) => ({
      tables: total.tables + 1,
      seats: total.seats + (table.enabled ? table.seats : 0),
      disabled: total.disabled + (table.enabled ? 0 : 1),
    }),
    EMPTY_CAPACITY,
  );

/**
 * One capacity per room, keyed by room id.
 *
 * Every room is in the result, including the ones holding nothing, because the
 * summary beside a room's name has to read `0 tables` rather than disappear.
 * A table naming a room that is not in the list is ignored rather than counted
 * into the restaurant total by accident.
 */
export const capacityByRoom = (
  rooms: readonly Room[],
  tables: readonly RestaurantTable[],
): Record<string, RoomCapacity> => {
  const byRoom: Record<string, RestaurantTable[]> = Object.fromEntries(
    rooms.map((room) => [room.id, [] as RestaurantTable[]]),
  );

  tables.forEach((table) => byRoom[table.roomId]?.push(table));

  return Object.fromEntries(
    Object.entries(byRoom).map(([roomId, roomTables]) => [
      roomId,
      capacityOf(roomTables),
    ]),
  );
};

/** The whole restaurant: its rooms, and the capacity standing in them. */
export interface RestaurantCapacity extends RoomCapacity {
  rooms: number;
}

/**
 * The restaurant-level summary.
 *
 * Summed over the rooms rather than over every table handed in, so a table
 * still naming a room the owner deleted cannot inflate the total the owner is
 * shown.
 */
export const restaurantCapacity = (
  rooms: readonly Room[],
  tables: readonly RestaurantTable[],
): RestaurantCapacity => {
  const byRoom = capacityByRoom(rooms, tables);

  return Object.values(byRoom).reduce<RestaurantCapacity>(
    (total, capacity) => ({
      rooms: total.rooms,
      tables: total.tables + capacity.tables,
      seats: total.seats + capacity.seats,
      disabled: total.disabled + capacity.disabled,
    }),
    { ...EMPTY_CAPACITY, rooms: rooms.length },
  );
};

/** A level of the restaurant, and the rooms on it. */
export interface FloorGroup {
  /** The level's name, or `undefined` for the rooms that name no level. */
  floor?: string;
  rooms: Room[];
}

/**
 * A blank floor is no floor.
 *
 * An owner who clears the field leaves an empty string behind, and a group
 * headed by nothing is indistinguishable from the ungrouped rooms while
 * splitting them into two lists.
 */
const floorOf = (room: Room): string | undefined => {
  const floor = room.floor?.trim();

  return floor ? floor : undefined;
};

/**
 * The rooms grouped by level, in the order they were already in.
 *
 * A group takes the position of its first room, so a plan does not reshuffle
 * when a floor is named. Rooms on the same level are gathered into that group
 * even when other rooms sit between them in `order` — otherwise `Ground floor`
 * would appear twice and the grouping would explain nothing.
 */
export const floorGroups = (rooms: readonly Room[]): FloorGroup[] => {
  const groups: FloorGroup[] = [];
  const byFloor = new Map<string | undefined, FloorGroup>();

  rooms.forEach((room) => {
    const floor = floorOf(room);
    const existing = byFloor.get(floor);

    if (existing) {
      existing.rooms.push(room);

      return;
    }

    const group: FloorGroup = { floor, rooms: [room] };

    byFloor.set(floor, group);
    groups.push(group);
  });

  return groups;
};

/** Whether any room names a level, which is what makes the headings worth showing. */
export const hasFloors = (rooms: readonly Room[]): boolean =>
  rooms.some((room) => floorOf(room) !== undefined);

/**
 * The rooms with one of them moved by `offset`, renumbered from the top.
 *
 * `order` is reassigned from the array position rather than swapped between the
 * two rooms, so the result is `0, 1, 2, …` whatever the stored values were.
 * That is what makes the order stable across reloads: a restaurant whose rooms
 * somehow share an order, or carry gaps, is healed by the first move instead of
 * sorting differently on the next read.
 *
 * Returns the list unchanged when the move would leave the list, so the first
 * room cannot be moved up and the last cannot be moved down.
 */
export const reorderedRooms = (
  rooms: readonly Room[],
  roomId: string,
  offset: number,
): Room[] => {
  const from = rooms.findIndex((room) => room.id === roomId);
  const to = from + offset;

  if (from < 0 || to < 0 || to >= rooms.length) {
    return [...rooms];
  }

  const moved = [...rooms];

  moved.splice(to, 0, ...moved.splice(from, 1));

  return moved.map((room, index) =>
    room.order === index ? room : { ...room, order: index },
  );
};

/**
 * The rooms whose stored `order` a reorder actually changes.
 *
 * Compared against the list as it was, so moving one room among five writes the
 * two documents that moved rather than all five. Each write costs a version
 * bump and can lose a race, so writing a room whose position did not change
 * would be spending a conflict on nothing.
 */
export const reorderWrites = (
  before: readonly Room[],
  after: readonly Room[],
): Room[] => {
  const stored = new Map(before.map((room) => [room.id, room.order]));

  return after.filter((room) => stored.get(room.id) !== room.order);
};
