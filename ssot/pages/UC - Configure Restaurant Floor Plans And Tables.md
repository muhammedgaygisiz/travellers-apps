# UC - Configure Restaurant Floor Plans And Tables

## Status

Not implemented. Specified through issue \#1070 as stage 1 of issue \#735.

Blocked by [[UC - Own And Claim Restaurants]], because floor-plan data is restaurant-scoped and cannot be trusted while the Firestore rules allow every authenticated user to write every document.

## Goal

A restaurant owner digitally recreates the dining area well enough that staff and guests recognise it, and that every table becomes an addressable business entity.

This is not a construction plan. It is a practical, easy-to-maintain top-down representation.

## Actors

- Restaurant owner

## Planned Flow

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

- Coordinates are stored in room-relative integer millimetres, so the same plan renders consistently on desktop, tablet, and mobile.
- The plan is structured data. Every object stays individually identifiable and editable. It is never stored as an image.
- Draft and published states are separate, so rearranging during service does not affect the live view.
- Publishing is blocked by duplicate table labels, zero capacity, or tables outside their room. Overlapping tables warn but do not block, because real rooms have odd arrangements.
- Editing the plan never writes live table state.

## Success Criteria

- An owner can build a two-room plan with at least twenty tables and reload it identically.
- Table 12 is retrievable as a business entity with its room, capacity, and position, without parsing an image.
- Every enabled table has exactly one active QR token, and tokens are not derivable from the table number.
- A printed QR sheet is legible and identifies restaurant, room, and table in human-readable text next to the code.

## Planned Evidence

- `libs/bite-tribe-business/floor-plan/page`
- `libs/bite-tribe-business/floor-plan/ui`
- `libs/bite-tribe-business/floor-plan/data-access`
- `libs/bite-tribe-common/model` room, table, and floor-plan-object types
- `/restaurants/{restaurantId}/rooms/{roomId}` and `/restaurants/{restaurantId}/tables/{tableId}`

## Related GitHub Scope

- Issue \#735 - Restaurant Interaction Platform umbrella
- Issue \#1070 - Restaurant floor plan and table configuration, with eleven child issues
- Issue \#1069 - Restaurant ownership, claiming and authorization, blocking prerequisite

## Related Domains

- [[Floor Plan]]
- [[Table]]
- [[Restaurant]]
