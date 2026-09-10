/**
 * The geometry half of a restaurant floor plan: a room, its dimensions, and
 * the objects standing in it. Tables are business entities and live in
 * `restaurant-table.ts`.
 *
 * ## Coordinate system
 *
 * Every coordinate in a floor plan is a room-relative integer millimetre.
 *
 * | Property | Rule                                         |
 * | -------- | -------------------------------------------- |
 * | Origin   | Top-left corner of the room                  |
 * | `x`      | Increases to the right                       |
 * | `y`      | Increases downward                           |
 * | Unit     | Millimetres, integer                         |
 * | Rotation | Degrees clockwise, `0` to `359`              |
 * | Position | Centre of the shape's unrotated bounding box |
 *
 * Physical units rather than pixels or normalised values, because real
 * dimensions let a plan be checked for plausibility, printed to scale, and
 * reasoned about for capacity. Integers because snapping to a grid repeatedly
 * must not accumulate floating-point drift.
 *
 * A position is the centre rather than a corner so `rotation` means one thing
 * everywhere: the shape turns about its own position, and a rotated object
 * therefore keeps the anchor the editor dragged.
 *
 * Nothing in this file refers to a rendering surface. There are no pixels, no
 * viewport and no device assumption, so a renderer maps millimetres into its
 * own space and one stored plan draws identically on desktop, tablet, mobile
 * and paper.
 *
 * The product rules behind these shapes are in `ssot/pages/Floor Plan.md`.
 */

/**
 * A length in whole millimetres.
 *
 * The alias carries the unit to every use site, because a bare `number` on a
 * `width` is exactly the field that later gets a pixel written into it.
 */
export type Millimetres = number;

/**
 * Degrees clockwise, `0` to `359`.
 *
 * The range is a contract, not a type: TypeScript cannot express it without
 * 360 literals, so the editor and the publish validation of issue #1088 keep
 * it. A value outside the range is a bug, not a second convention.
 */
export type FloorPlanRotation = number;

/** A point in room millimetres, measured from the room's top-left corner. */
export interface FloorPlanPoint {
  x: Millimetres;
  y: Millimetres;
}

/** A rectangular extent in millimetres, before any rotation is applied. */
export interface FloorPlanSize {
  width: Millimetres;
  height: Millimetres;
}

/**
 * What a piece of floor-plan geometry represents.
 *
 * None of these carry business identity: they are drawn, recognised and moved,
 * and nothing digital ever attaches to one. `chair` is in this list on
 * purpose - a chair is geometry that helps staff recognise the room, while
 * seating capacity is a number on the table (see `RestaurantTable.seats`).
 *
 * - `wall` - a wall segment or a room divider.
 * - `door` - a doorway or an entrance.
 * - `counter` - a service or pass counter.
 * - `bar` - a bar area guests can sit at.
 * - `blocked` - floor area no table may occupy, such as a pillar or a stair.
 * - `decoration` - a plant, a screen, anything purely visual.
 * - `chair` - seating geometry, including a bench or a banquette.
 */
export type FloorPlanObjectType =
  'wall' | 'door' | 'counter' | 'bar' | 'blocked' | 'decoration' | 'chair';

/** A single piece of geometry in a room. */
export interface FloorPlanObject {
  /** Unique within its room, stable for as long as the object exists. */
  id: string;
  type: FloorPlanObjectType;
  /** Centre of the object, in room millimetres. */
  position: FloorPlanPoint;
  /** Extent before rotation. A wall segment is a long, thin rectangle. */
  size: FloorPlanSize;
  rotation: FloorPlanRotation;
  /** Optional text drawn with the object, such as `Entrance` or `Pillar`. */
  label?: string;
}

/**
 * A room, floor or outdoor area of one restaurant's floor plan.
 *
 * A room holds its geometry inline because a plan is always loaded and saved
 * as a whole room, which keeps a plan load to one document read per room.
 * Tables are not in here: they are separate documents under
 * `/restaurants/{restaurantId}/tables/{tableId}` because they have their own
 * lifecycle and are referenced by live state, visits and orders.
 *
 * The owning restaurant is not a field. A room is stored at
 * `/restaurants/{restaurantId}/rooms/{roomId}`, so the path already says it.
 */
export interface Room {
  /** Unique within its restaurant, stable for the room's lifetime. */
  id: string;
  /** Display name the owner chose, such as `Main dining room` or `Terrace`. */
  name: string;
  /** Ascending display order among the rooms of one restaurant. */
  order: number;
  /** Physical extent of the room. */
  size: FloorPlanSize;
  /** Non-table geometry standing in the room. */
  objects: FloorPlanObject[];
  /**
   * Optimistic concurrency version, incremented on every accepted write.
   *
   * Two devices editing one plan is the normal case rather than the edge case,
   * because an owner rearranges on a tablet in the room while the laptop in
   * the office still shows the old plan. A write carries the version it read
   * and is rejected when it no longer matches, so the second save is told to
   * reload instead of silently overwriting the first. Enforcement belongs to
   * the persistence layer of issue #1081.
   */
  version: number;
}
