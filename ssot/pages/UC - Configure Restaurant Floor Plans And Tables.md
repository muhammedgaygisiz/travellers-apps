# UC - Configure Restaurant Floor Plans And Tables

## Status

**Level:** L1

Partly implemented. Specified through issue \#1070 as stage 1 of issue \#735.

An owner can reach the editor, build the room and describe its tables:
`restaurant/:restaurantId/floor-plan` in the business app creates, renames,
resizes and deletes rooms, and draws one of them on a millimetre-accurate canvas
with a grid, pan, zoom and a scale reference (issue \#1082). Issue \#1083 put
the furniture in it: a palette of nine objects, drag or keyboard placement, move,
resize, rotate, multi-select, duplicate, delete, snapping to the grid and to
adjacent edges, and an undo history over all of it.

Issue \#1084 made a table a business entity rather than a rectangle. The owner
sets its public number, its seating capacity, its shape and whether it is in
service, and the number is unique across the whole restaurant rather than the
open room: the editor reads every table of the restaurant, refuses a label
another one already holds and names the room that holds it. A selection can be
numbered consecutively in one action, and the plan draws each table's number
with its capacity under it.

The planned flow from "adds further rooms or floors" onward is still
specification. Moving a table between rooms is issue \#1085, publishing is issue
\#1088, and QR tokens are issue \#1086.

No longer blocked. [[UC - Own And Claim Restaurants]] was the prerequisite,
because floor-plan data is restaurant-scoped and could not be trusted while the
Firestore rules allowed every authenticated user to write every document; issue
\#1078 replaced those rules and issue \#1081 scoped the room and table
collections to the account holding the restaurant. Those rules are deployed by
hand, so production is only bound once
`npx nx firebase-deploy-rules bite-tribe-firebase` has run.

## Goal

A restaurant owner digitally recreates the dining area well enough that staff and guests recognise it, and that every table becomes an addressable business entity.

This is not a construction plan. It is a practical, easy-to-maintain top-down representation.

## Actors

- Restaurant owner

## Planned Flow

The first five steps are implemented; the rest are specification.

- Owner opens the floor-plan editor for a restaurant they own.
- Owner creates a room and sets its width and height in metres.
- Owner places geometry: walls, doors, counters, bar areas, blocked areas, chairs, decoration.
- Owner places tables, then moves, resizes, rotates, duplicates, and deletes them.
- Owner assigns each table a public label, a seating capacity, and an enabled state.
- Owner adds further rooms or floors and can move a table between rooms without changing its identity.
- Owner validates the plan and publishes it.
- The system generates an opaque QR token for every enabled table.
- Owner prints QR sheets, as table tents or as a sticker grid, and places them in the room.

## Key Behaviours

- Coordinates are stored in room-relative integer millimetres, so the same plan renders consistently on desktop, tablet, and mobile. The editor's SVG `viewBox` is in those same millimetres, and the owner types metres: the conversion happens at the form boundary and in the canvas's scale label, and nowhere else.
- Pan, zoom and the grid are viewport state and are stored nowhere. Moving over a plan changes no stored field, and turning snapping on decides where the next measurement lands rather than moving anything already drawn.
- A save that lost a race against another device shows the room as it is stored, not a failure message. See [[Floor Plan]].
- The plan is structured data. Every object stays individually identifiable and editable. It is never stored as an image.
- An object's centre stays inside its room, so nothing can be dragged off the plan and lost, while a bar counter can still overhang the wall it is built into.
- A gesture is one undo step. What is on screen mid-drag is a preview the editor holds; the plan is written once, when the pointer is released.
- Every mutation is reachable from the keyboard alone, which is why a palette entry can be activated as well as dragged.
- A table's number is unique across the restaurant, not the room. The editor holds every table of the restaurant and refuses a duplicate label outright, naming the room that already has it, so the plan being edited can never itself contain two tables called 12. Case and surrounding spaces do not make a second number: staff say `A1` and `a1` identically and a printed sheet cannot carry the difference.
- Geometry and identity are edited by different paths and neither touches the other. Dragging a table cannot rename it, and renaming it cannot move it.
- A table taken out of service stays on the plan and is drawn differently. It is a real place in the room that is not taking guests, so hiding it would leave the owner rearranging around something they cannot see.
- Numbering is an action over a selection rather than a field per table, because a room of twenty tables is built by duplicating one. It runs in reading order and skips numbers held elsewhere in the restaurant, so it cannot create the collision a single rename refuses.
- Draft and published states are separate, so rearranging during service does not affect the live view.
- Publishing is blocked by duplicate table labels, zero capacity, or tables outside their room. Overlapping tables warn but do not block, because real rooms have odd arrangements. The editor already refuses all three as they are typed; the publish gate of issue \#1088 is what catches a plan that reached that state another way.
- Editing the plan never writes live table state.

## Success Criteria

- An owner can build a two-room plan with at least twenty tables and reload it identically.
- Table 12 is retrievable as a business entity with its room, capacity, and position, without parsing an image.
- Every enabled table has exactly one active QR token, and tokens are not derivable from the table number.
- A printed QR sheet is legible and identifies restaurant, room, and table in human-readable text next to the code.

## Supported Evidence

Implemented:

- `libs/bite-tribe-common/model` room, table, and floor-plan-object types
- `libs/bite-tribe-business/floor-plan/data-access` load, save, conflict signalling
- `libs/bite-tribe-business/floor-plan/ui` the canvas, the grid, the metre/millimetre conversion, the object palette, the edit geometry, the shape conversion
- `libs/bite-tribe-business/floor-plan/page` the editor page, its workflow, the label rule and the bulk numbering
- `libs/bite-tribe-business/shell` the `restaurant/:restaurantId/floor-plan` route and its owner gate
- `apps/bite-tribe-firebase/firestore.rules` room and table scoping, and the version rule
- `/restaurants/{restaurantId}/rooms/{roomId}` and `/restaurants/{restaurantId}/tables/{tableId}`

Still planned:

- QR tokens, printable sheets, multi-room grouping and cross-room moves, and the draft/published split

## Related GitHub Scope

- Issue \#735 - Restaurant Interaction Platform umbrella
- Issue \#1070 - Restaurant floor plan and table configuration, with eleven child issues
- Issue \#1069 - Restaurant ownership, claiming and authorization, prerequisite, delivered
- Issue \#1080 - the shared model and the coordinate system, delivered
- Issue \#1081 - persistence, rules and optimistic concurrency, delivered
- Issue \#1082 - the editor canvas, rooms and the grid, delivered
- Issue \#1083 - placing, moving, resizing and rotating floor-plan objects, delivered
- Issue \#1084 - table properties, label uniqueness, numbering and capacity, delivered

## Related Domains

- [[Floor Plan]]
- [[Table]]
- [[Restaurant]]
