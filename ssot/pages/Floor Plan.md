# Floor Plan

## Purpose

A Floor Plan is a restaurant's structured two-dimensional representation of its dining area.

It is the structural connection between a restaurant's physical space and its digital BiteTribe presence. Rooms, tables, and objects become addressable data instead of a drawing.

## Why It Exists

The Floor Plan exists to answer:

> Which physical places in this restaurant can a guest sit at, and how do I address one of them digitally?

Without it, a table QR code, a live occupancy view, and an order attached to table 12 have nothing to refer to.

The Floor Plan is deliberately not an architecturally exact construction plan. It is a practical, easy-to-maintain top-down representation that staff and guests can recognise.

## Business Rules

- A Restaurant can have one Floor Plan.
- A Floor Plan contains one or more Rooms, which may represent rooms, floors, or outdoor areas.
- A Room has physical dimensions and contains geometry objects and Tables.
- Geometry objects are walls, doors, counters, bar areas, blocked areas, chairs, and decorative objects. They carry no business identity.
- A Table is a business entity, not a shape. See [[Table]].
- Chairs are geometry. Seating capacity is a number on the Table.
- A Room cannot be deleted while it still contains Tables.
- A Floor Plan has a draft state and a published state. Only the published state is read by staff and guest surfaces.
- Editing the Floor Plan never writes live table state, and a live state change never writes the Floor Plan.
- Only the owner of the Restaurant may edit the Floor Plan.

## Coordinate System

Coordinates are stored as room-relative integer millimetres.

| Property | Rule                                         |
| -------- | -------------------------------------------- |
| Origin   | Top-left corner of the room                  |
| x        | Increases to the right                       |
| y        | Increases downward                           |
| Unit     | Millimetres, integer                         |
| Rotation | Degrees clockwise, 0 to 359                  |
| Position | Centre of the shape's unrotated bounding box |

Physical units rather than pixels or normalised values, because real dimensions let the plan be checked for plausibility, printed to scale, and reasoned about for capacity. Integers avoid floating-point drift when snapping. Rendering uses an SVG `viewBox` in millimetres, so desktop, tablet, and mobile scale from identical stored data.

A position is the centre and not a corner, for geometry objects exactly as for tables, so that `rotation` means one thing everywhere: the shape turns about its own position, and a rotated object keeps the anchor the editor dragged. Issue \#1080 made that explicit when the model was written; the earlier wording named only the table and left an object's anchor undecided.

## Required Data

Room:

| Field     | Description                                          |
| --------- | ---------------------------------------------------- |
| `id`      | Unique room identifier                               |
| `name`    | Display name, such as main dining room or terrace    |
| `order`   | Ascending display order among the restaurant's rooms |
| `size`    | `{ width, height }` in millimetres                   |
| `objects` | Geometry objects in the room                         |
| `version` | Optimistic concurrency version                       |

Floor plan object:

| Field      | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `id`       | Unique object identifier                                           |
| `type`     | `wall`, `door`, `counter`, `bar`, `blocked`, `decoration`, `chair` |
| `position` | `{ x, y }` in room millimetres, centre of the object               |
| `size`     | `{ width, height }` in millimetres                                 |
| `rotation` | Degrees clockwise                                                  |
| `label`    | Optional display label                                             |

## Optional Data

- Floor or level grouping across rooms
- Grid spacing preference
- Per-room capacity summary

## Relationships

```text
Restaurant
|-- Floor Plan
    |-- Rooms
        |-- Floor plan objects (geometry)
        |-- Tables (business entities)
```

## Lifecycle

```text
Restaurant is owned by a user with the business role
|
Owner creates a room and sets its dimensions
|
Owner places geometry and tables
|
Owner assigns table numbers and capacities
|
Owner validates and publishes the plan
|
QR tokens are generated for enabled tables
|
Published plan is read by staff live view and by guest QR resolution
```

## Permissions

- Guest: no access to the plan structure. A guest only ever resolves a single table through a QR token.
- Registered user: no access.
- Restaurant staff: read the published plan. No write access.
- Restaurant owner: full read and write.
- Admin: read for support and moderation. Editing the plan is restaurant maintenance, and `admin` does not imply `business` (issue \#1164), so an edit goes through the assigned owner.

`firestore.rules` enforces all of this since issue \#1081, with one clause deliberately missing: staff read nothing yet. A staff read is a read of the _published_ plan, there is no published state until issue \#1088 splits draft from published, and admitting staff before then would hand them the draft an owner is halfway through rearranging. The clause belongs with the state it depends on.

## Use Cases

- [[UC - Configure Restaurant Floor Plans And Tables]]
- [[UC - Order At The Table Through A QR Code]]

## Related Epics

- Issue \#735 - Restaurant Interaction Platform (umbrella)
- Issue \#1070 - Restaurant floor plan and table configuration
- Issue \#1069 - Restaurant ownership, claiming and authorization (prerequisite)

## Technical Implementation

Planned Firestore layout:

```text
/restaurants/{restaurantId}/rooms/{roomId}
/restaurants/{restaurantId}/tables/{tableId}
```

Non-table geometry lives as an array inside its room document because it is always loaded and saved together. Tables are separate documents because they are business entities with independent lifecycles, referenced by live state, visits, and orders.

Libraries, of which the shared model and the data-access layer exist today:

```text
libs/bite-tribe-common/model                        floor plan, room, table types
libs/bite-tribe-business/floor-plan/data-access     load, save, conflict signalling
libs/bite-tribe-business/floor-plan/page            planned, issue #1082
libs/bite-tribe-business/floor-plan/ui              planned, issue #1082
```

Issue \#1080 wrote the model as two files in `libs/bite-tribe-common/model/src/lib`: `floor-plan.ts` holds `Room`, `FloorPlanObject`, and the coordinate-system primitives `Millimetres`, `FloorPlanPoint`, `FloorPlanSize`, and `FloorPlanRotation`; `restaurant-table.ts` holds `RestaurantTable`. The coordinate system above is repeated as the file header of `floor-plan.ts`, because the rule has to be readable where the fields are.

`RestaurantTable` is a union discriminated on `shape`, so a `round` table carries a `diameter` and a `rectangle` carries a `size` and neither can carry both. That library is types only, so nothing in it can drift into a helper the persistence layer should own.

Issue \#1081 made the layout real. `apps/bite-tribe-firebase/firestore.rules` scopes both collections to the account holding the restaurant, for reads as well as writes: the plan is a new collection with no prior read behaviour to preserve, and a restaurant's interior layout is not something every signed-in account should be able to enumerate.

`libs/bite-tribe-business/floor-plan/data-access` is the client half. `loadRoomPlan` is one document read plus one tables query however many objects are drawn, `saveRoom` writes only the room document, and `deleteRoom` refuses while a table still names the room.

Optimistic concurrency lives in the rules rather than in the client. A room save carries `version + 1` of the version it was read at, and the rule accepts the write only when that is the successor of the stored version; a create must be version 1. Two devices that both read version `n` therefore cannot both land: the second is refused and gets a `FloorPlanConflictError` carrying the stored room, so the owner is offered what is stored instead of silently overwriting a rearrangement they never saw. A rule rather than a transaction, because a transaction protects only the client that opens one.

The room-cannot-be-deleted-while-it-holds-tables rule is the one business rule the rules file cannot carry: security rules read named documents and cannot query, so no rule can ask whether a collection is empty. It is enforced in the data-access library, which is the right place for it - an owner orphaning their own tables is a data-integrity mistake rather than an account reaching data it does not hold, and that second part is refused by the rules.

Rendering uses SVG rather than canvas: object counts are low, hit-testing and accessibility come for free, and it prints cleanly for QR sheets.

## Current Limitations

- Nothing user-visible is shipped. Issue \#1080 landed the shared types and this page's coordinate system, issue \#1081 the persistence, the rules and the conflict handling; there is no editor and no QR token yet, so no owner can reach any of it.
- The rules are deployed by hand. `npx nx firebase-deploy-rules bite-tribe-firebase` has to run before the floor-plan rules mean anything in production; merging them changes nothing on its own.
- Draft and published are not separated yet (issue \#1088), which is why staff read nothing and why every saved room is live to whatever reads it.
- Multi-floor grouping is modelled but may ship after single-room support.
- No CAD import, no exact scale drawing, and no automatic layout.

## Future Ideas

- Capacity planning and turnover analysis derived from the plan
- Guest-facing room preview when choosing a table
- Reservation blocks drawn directly on the plan

## Sources Used

- [[Restaurant]]
- [[Table]]
- [[Table Visit]]
- [[Mission]]
- [[Principles]]
