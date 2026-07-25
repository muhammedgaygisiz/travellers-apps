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
- Only the owning organisation of the Restaurant may edit the Floor Plan.

## Coordinate System

Coordinates are stored as room-relative integer millimetres.

| Property       | Rule                        |
| -------------- | --------------------------- |
| Origin         | Top-left corner of the room |
| x              | Increases to the right      |
| y              | Increases downward          |
| Unit           | Millimetres, integer        |
| Rotation       | Degrees clockwise, 0 to 359 |
| Table position | Centre of the table         |

Physical units rather than pixels or normalised values, because real dimensions let the plan be checked for plausibility, printed to scale, and reasoned about for capacity. Integers avoid floating-point drift when snapping. Rendering uses an SVG `viewBox` in millimetres, so desktop, tablet, and mobile scale from identical stored data.

## Required Data

Room:

| Field     | Description                                       |
| --------- | ------------------------------------------------- |
| `id`      | Unique room identifier                            |
| `name`    | Display name, such as main dining room or terrace |
| `size`    | `{ width, height }` in millimetres                |
| `objects` | Geometry objects in the room                      |
| `version` | Optimistic concurrency version                    |

Floor plan object:

| Field      | Description                                                        |
| ---------- | ------------------------------------------------------------------ |
| `id`       | Unique object identifier                                           |
| `type`     | `wall`, `door`, `counter`, `bar`, `blocked`, `decoration`, `chair` |
| `position` | `{ x, y }` in room millimetres                                     |
| `size`     | `{ width, height }` in millimetres                                 |
| `rotation` | Degrees clockwise                                                  |
| `label`    | Optional display label                                             |

## Optional Data

- Floor or level grouping across rooms
- Room display order
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
Restaurant is owned by an organisation
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
- Restaurant owner or organisation member: full read and write.
- Admin: full access for support and moderation.

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

Planned libraries:

```text
libs/bite-tribe-common/model            floor plan, room, table types
libs/bite-tribe-business/floor-plan/page
libs/bite-tribe-business/floor-plan/ui
libs/bite-tribe-business/floor-plan/data-access
```

Rendering uses SVG rather than canvas: object counts are low, hit-testing and accessibility come for free, and it prints cleanly for QR sheets.

## Current Limitations

- Not implemented yet. This page describes the agreed model, not shipped behaviour.
- Blocked by restaurant ownership and authorization. `apps/bite-tribe-firebase/firestore.rules` currently allows every authenticated user to write every document, so no restaurant-scoped data can be trusted until issue \#1069 lands.
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
