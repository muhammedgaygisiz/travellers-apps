import {
  FloorPlanDraft,
  FloorPlanObject,
  FloorPlanSize,
  RestaurantTable,
  Room,
} from 'model';
import { FloorPlanLayout, layoutOf, tableWrites } from './floor-plan-layout';
import { RoomDraft } from './room-draft';

/**
 * The draft, the publish and what moved between them
 * (GitHub issue #1088).
 *
 * Pure functions over values, with no Firestore and no signals in sight, so
 * "what would publishing change" can be asserted directly rather than through
 * an editor.
 */

/** The room's own fields, as the form has them and as a draft stores them. */
export interface RoomFields {
  name: string;
  floor?: string;
  size: FloorPlanSize;
}

/** The room's fields as they are published right now. */
export const publishedFields = (room: Room): RoomFields => ({
  name: room.name,
  size: room.size,
  ...(room.floor === undefined ? {} : { floor: room.floor }),
});

/** The room's fields as the owner has them in a stored draft. */
export const draftFields = (draft: FloorPlanDraft): RoomFields => ({
  name: draft.name,
  size: draft.size,
  ...(draft.floor === undefined ? {} : { floor: draft.floor }),
});

/** The same, out of what the editor's room form is holding. */
export const formFields = (form: RoomDraft): RoomFields => ({
  name: form.name,
  size: { width: form.width, height: form.height },
  ...(form.floor === undefined ? {} : { floor: form.floor }),
});

/** The arrangement a stored draft holds, in the shape the editor works on. */
export const draftLayout = (draft: FloorPlanDraft): FloorPlanLayout => ({
  objects: [...draft.objects],
  tables: [...draft.tables],
});

/**
 * The plan the editor should open a room on.
 *
 * The draft when there is one, because an owner who closed the browser mid-edit
 * is coming back to what they were doing. The published plan otherwise.
 */
export const openingLayout = (
  room: Room | undefined,
  tables: readonly RestaurantTable[],
  draft: FloorPlanDraft | undefined,
): FloorPlanLayout => (draft ? draftLayout(draft) : layoutOf(room, tables));

/** The room's fields the editor should open with, by the same rule. */
export const openingFields = (
  room: Room,
  draft: FloorPlanDraft | undefined,
): RoomFields => (draft ? draftFields(draft) : publishedFields(room));

export const sameFields = (left: RoomFields, right: RoomFields): boolean =>
  left.name === right.name &&
  (left.floor ?? '') === (right.floor ?? '') &&
  left.size.width === right.size.width &&
  left.size.height === right.size.height;

/**
 * What publishing would change, counted rather than listed.
 *
 * Counted because the summary answers "is this what I think I am publishing",
 * which a line per moved chair would bury. The room's own fields are named
 * individually because there are three of them and each one is a different
 * kind of surprise: a rename shows up in every list, a resize can put a table
 * outside the room, and a floor name regroups the switcher.
 */
export interface FloorPlanChangeSummary {
  roomRenamed: boolean;
  roomResized: boolean;
  floorChanged: boolean;
  tablesAdded: number;
  tablesChanged: number;
  tablesRemoved: number;
  objectsAdded: number;
  objectsChanged: number;
  objectsRemoved: number;
  /** False when publishing would write the plan that is already published. */
  changed: boolean;
}

export const NOTHING_CHANGED: FloorPlanChangeSummary = {
  roomRenamed: false,
  roomResized: false,
  floorChanged: false,
  tablesAdded: 0,
  tablesChanged: 0,
  tablesRemoved: 0,
  objectsAdded: 0,
  objectsChanged: 0,
  objectsRemoved: 0,
  changed: false,
};

/**
 * The difference between what is published and what publishing would write.
 *
 * Tables reuse {@link tableWrites}, which is the same comparison the save
 * itself makes, so the summary cannot promise a write the save does not
 * perform. It is split into added and changed here because the two read
 * differently to an owner: three new tables is a rearrangement, three changed
 * tables might be three that moved 50 mm.
 */
export const changeSummary = (
  published: { fields: RoomFields; layout: FloorPlanLayout },
  current: { fields: RoomFields; layout: FloorPlanLayout },
): FloorPlanChangeSummary => {
  const storedTables = new Set(published.layout.tables.map((t) => t.id));
  const tables = tableWrites(published.layout.tables, current.layout.tables);
  const added = tables.changed.filter((table) => !storedTables.has(table.id));

  const storedObjects = new Map(
    published.layout.objects.map((object) => [object.id, object]),
  );
  const currentObjectIds = new Set(
    current.layout.objects.map((object) => object.id),
  );
  const objectsAdded = current.layout.objects.filter(
    (object) => !storedObjects.has(object.id),
  ).length;
  const objectsChanged = current.layout.objects.filter((object) => {
    const stored = storedObjects.get(object.id);

    return stored !== undefined && !sameObjectValue(stored, object);
  }).length;
  const objectsRemoved = published.layout.objects.filter(
    (object) => !currentObjectIds.has(object.id),
  ).length;

  const summary = {
    roomRenamed: published.fields.name !== current.fields.name,
    roomResized:
      published.fields.size.width !== current.fields.size.width ||
      published.fields.size.height !== current.fields.size.height,
    floorChanged:
      (published.fields.floor ?? '') !== (current.fields.floor ?? ''),
    tablesAdded: added.length,
    tablesChanged: tables.changed.length - added.length,
    tablesRemoved: tables.deleted.length,
    objectsAdded,
    objectsChanged,
    objectsRemoved,
  };

  return {
    ...summary,
    changed: Object.values(summary).some((value) =>
      typeof value === 'boolean' ? value : value > 0,
    ),
  };
};

/** Whether a geometry object is unchanged, field by field. */
const sameObjectValue = (
  left: FloorPlanObject,
  right: FloorPlanObject,
): boolean =>
  left.type === right.type &&
  left.label === right.label &&
  left.position.x === right.position.x &&
  left.position.y === right.position.y &&
  left.size.width === right.size.width &&
  left.size.height === right.size.height &&
  left.rotation === right.rotation;
