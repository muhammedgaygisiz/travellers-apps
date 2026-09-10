import {
  DEFAULT_TABLE_SEATS,
  FloorPlanItem,
  FloorPlanPaletteEntry,
  clampCentre,
  objectWithItemGeometry,
  tableShapeOf,
  tableWithItemGeometry,
} from 'bite-tribe-business/floor-plan-ui';
import {
  FloorPlanObject,
  FloorPlanObjectType,
  FloorPlanPoint,
  FloorPlanSize,
  RestaurantTable,
  Room,
} from 'model';
import { v4 as uuid } from 'uuid';

/**
 * One room's contents while the owner is editing them (GitHub issue #1083).
 *
 * The two halves are kept apart here for the same reason they are kept apart in
 * Firestore: geometry is a field of the room document and a table is a document
 * of its own with its own lifetime (issue #1081). The editor works on both at
 * once, so this is the pair, and the canvas flattens it into
 * {@link FloorPlanItem}s to draw.
 *
 * It is a value, not a store. Every function here returns a new layout, which
 * is what lets the undo history keep the previous one intact rather than trying
 * to invert a mutation after the fact.
 */
export interface FloorPlanLayout {
  objects: FloorPlanObject[];
  tables: RestaurantTable[];
}

export const EMPTY_LAYOUT: FloorPlanLayout = { objects: [], tables: [] };

export const layoutOf = (
  room: Room | undefined,
  tables: readonly RestaurantTable[],
): FloorPlanLayout => ({
  objects: room ? [...room.objects] : [],
  tables: [...tables],
});

/**
 * The next free table number, as the label a new table starts with.
 *
 * The smallest unused positive integer rather than "one more than the count",
 * so deleting table 3 out of five and placing another gives table 3 back
 * instead of a second table 5. Uniqueness within the restaurant, its conflict
 * message and the owner's own naming are issue #1084 — this only has to be a
 * plausible label that does not collide with the room the owner is looking at.
 */
export const nextTableLabel = (tables: readonly RestaurantTable[]): string => {
  const taken = new Set(tables.map((table) => table.label));
  let number = 1;

  while (taken.has(String(number))) {
    number += 1;
  }

  return String(number);
};

/** A new object or table from a palette entry, dropped at `position`. */
export const placeEntry = (
  layout: FloorPlanLayout,
  entry: FloorPlanPaletteEntry,
  position: FloorPlanPoint,
  roomId: string,
): { layout: FloorPlanLayout; id: string } => {
  const id = uuid();
  const shape = tableShapeOf(entry.variant);

  if (!shape) {
    const object: FloorPlanObject = {
      id,
      type: entry.variant as FloorPlanObjectType,
      position,
      size: entry.size,
      rotation: 0,
    };

    return {
      layout: { ...layout, objects: [...layout.objects, object] },
      id,
    };
  }

  const base = {
    id,
    label: nextTableLabel(layout.tables),
    roomId,
    position,
    rotation: 0,
    seats: DEFAULT_TABLE_SEATS,
    enabled: true,
  };

  const table: RestaurantTable =
    shape === 'round'
      ? { ...base, shape: 'round', diameter: entry.size.width }
      : { ...base, shape: 'rectangle', size: entry.size };

  return { layout: { ...layout, tables: [...layout.tables, table] }, id };
};

/**
 * The layout with the geometry of `changed` written back on to it.
 *
 * Only the four geometry fields move, and only for the ids the gesture
 * touched. A label, a capacity or an enabled state cannot be lost by dragging
 * the table it belongs to, because nothing on this path can see them.
 */
export const withItemGeometry = (
  layout: FloorPlanLayout,
  changed: readonly FloorPlanItem[],
): FloorPlanLayout => {
  const byId = new Map(changed.map((item) => [item.id, item]));

  return {
    objects: layout.objects.map((object) => {
      const item = byId.get(object.id);

      return item ? objectWithItemGeometry(object, item) : object;
    }),
    tables: layout.tables.map((table) => {
      const item = byId.get(table.id);

      return item ? tableWithItemGeometry(table, item) : table;
    }),
  };
};

export const withoutIds = (
  layout: FloorPlanLayout,
  ids: readonly string[],
): FloorPlanLayout => {
  const removed = new Set(ids);

  return {
    objects: layout.objects.filter((object) => !removed.has(object.id)),
    tables: layout.tables.filter((table) => !removed.has(table.id)),
  };
};

/**
 * Copies of `ids`, offset by `delta`, appended to the layout.
 *
 * A duplicated table gets a fresh label as well as a fresh id, because two
 * tables called `7` is exactly the conflict the owner would then have to hunt
 * for — and duplicating is how a room of twenty tables gets built, so the
 * conflict would arrive twenty at a time.
 *
 * The copies obey the room like every other placement: a table already against
 * the far wall duplicates on to the wall rather than off the plan. Each centre
 * is clamped on its own here, unlike a drag, because these copies are not a
 * group being moved — the owner is about to drag each of them somewhere anyway,
 * and one that landed outside would be a table they could not find.
 *
 * The new ids come back with the layout so the caller can select the copies
 * rather than the originals. That is what makes duplicate repeatable: place,
 * duplicate, nudge, duplicate again, each copy landing off the last.
 */
export const duplicateIds = (
  layout: FloorPlanLayout,
  ids: readonly string[],
  delta: FloorPlanPoint,
  room: FloorPlanSize,
): { layout: FloorPlanLayout; ids: string[] } => {
  const chosen = new Set(ids);
  const moved = <T extends { position: FloorPlanPoint }>(source: T): T => ({
    ...source,
    position: clampCentre(
      {
        x: source.position.x + delta.x,
        y: source.position.y + delta.y,
      },
      room,
    ),
  });

  const objects = layout.objects
    .filter((object) => chosen.has(object.id))
    .map((object) => moved({ ...object, id: uuid() }));

  const tables = layout.tables
    .filter((table) => chosen.has(table.id))
    .reduce<RestaurantTable[]>(
      (created, table) => [
        ...created,
        moved({
          ...table,
          id: uuid(),
          label: nextTableLabel([...layout.tables, ...created]),
        }),
      ],
      [],
    );

  return {
    layout: {
      objects: [...layout.objects, ...objects],
      tables: [...layout.tables, ...tables],
    },
    ids: [...objects, ...tables].map((created) => created.id),
  };
};

/** Every id in the layout, in the order the canvas draws them. */
export const layoutIds = (layout: FloorPlanLayout): string[] => [
  ...layout.objects.map((object) => object.id),
  ...layout.tables.map((table) => table.id),
];

/** Whether two tables are the same document, field by field. */
const sameTable = (left: RestaurantTable, right: RestaurantTable): boolean =>
  left.label === right.label &&
  left.roomId === right.roomId &&
  left.position.x === right.position.x &&
  left.position.y === right.position.y &&
  left.rotation === right.rotation &&
  left.seats === right.seats &&
  left.enabled === right.enabled &&
  left.qrTokenId === right.qrTokenId &&
  left.shape === right.shape &&
  (left.shape === 'round' && right.shape === 'round'
    ? left.diameter === right.diameter
    : left.shape === 'rectangle' && right.shape === 'rectangle'
      ? left.size.width === right.size.width &&
        left.size.height === right.size.height
      : false);

/** Whether two geometry objects are the same, field by field. */
const sameObject = (left: FloorPlanObject, right: FloorPlanObject): boolean =>
  left.type === right.type &&
  left.label === right.label &&
  left.position.x === right.position.x &&
  left.position.y === right.position.y &&
  left.size.width === right.size.width &&
  left.size.height === right.size.height &&
  left.rotation === right.rotation;

/**
 * The tables that have to be written, and the ids that have to be deleted.
 *
 * Worked out against the tables as they were loaded rather than tracked as the
 * owner edits, because a table dragged out and dragged back is not a change and
 * a dirty flag set on the way out would never learn that. Comparing values also
 * means the same answer whatever route the edit took: a drag, a nudge, an undo
 * or a redo all end up as "is this document different from the stored one".
 *
 * Field by field rather than by serialising both sides. A table read from
 * Firestore and one built in the editor carry the same fields in a different
 * order, so a string comparison would report every table as changed on every
 * save and the editor would never be able to say it had nothing to write.
 */
export const tableWrites = (
  saved: readonly RestaurantTable[],
  current: readonly RestaurantTable[],
): { changed: RestaurantTable[]; deleted: string[] } => {
  const before = new Map(saved.map((table) => [table.id, table]));
  const after = new Set(current.map((table) => table.id));

  return {
    changed: current.filter((table) => {
      const stored = before.get(table.id);

      return !stored || !sameTable(stored, table);
    }),
    deleted: saved
      .filter((table) => !after.has(table.id))
      .map((table) => table.id),
  };
};

/**
 * Whether the layout differs from the one that was loaded.
 *
 * This is what enables the save button for a plan whose *name and dimensions*
 * nobody touched. Without it, an owner could spend ten minutes arranging
 * twenty tables and find the only control that writes them greyed out.
 */
export const layoutChanged = (
  saved: FloorPlanLayout,
  current: FloorPlanLayout,
): boolean => {
  const objectsMatch =
    saved.objects.length === current.objects.length &&
    saved.objects.every(
      (object, index) =>
        object.id === current.objects[index].id &&
        sameObject(object, current.objects[index]),
    );

  const { changed, deleted } = tableWrites(saved.tables, current.tables);

  return !objectsMatch || changed.length > 0 || deleted.length > 0;
};
