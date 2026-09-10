# Table

## Purpose

A Table is a seating place in a restaurant, represented as a business entity rather than as a shape on a plan.

BiteTribe must be able to state that a specific object is table 12, has four seats, and sits in the main dining room, and then attach availability, visits, orders, payments, and Bites to it.

## Why It Exists

The Table is the unit that connects the physical restaurant to everything digital that happens during a visit. A QR code identifies a Table. A visit happens at a Table. An order belongs to a visit at a Table. A Bite can eventually be traced back to it.

## Business Rules

- A Table belongs to exactly one Room of exactly one Restaurant.
- A Table has a public label or number that is unique within its Restaurant, including across rooms.
- A Table has a seating capacity of at least one.
- A Table can be enabled or disabled. A disabled Table stays in the plan and is not orderable.
- A Table can be moved between Rooms while keeping its identity, its label, and its QR token, so printed codes stay valid.
- Every enabled Table has exactly one active QR token.
- A QR token is opaque and non-guessable. It never encodes the table number.
- Rotating a QR token revokes the previous one and does not change the Table's identity or history.
- Live state is not part of the Table. It lives separately, so operational updates never rewrite the layout. See [[Table Visit]].
- Deleting a Table revokes its QR token and must not destroy historical visits or orders that reference it.

## Table State Versus Table Enablement

These two are different and must not be conflated.

| Concept                    | Meaning                                                  | Owner                               |
| -------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `enabled` on the Table     | The table is in service at all, a configuration decision | Restaurant owner, in the floor plan |
| `disabled` as a live state | The table is blocked right now, an operational decision  | Restaurant staff, in the live view  |

## Required Data

| Field       | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `id`        | Internal identifier, stable for the table's lifetime              |
| `label`     | Public table number or name shown to staff and guests             |
| `roomId`    | Owning room                                                       |
| `position`  | `{ x, y }` in room millimetres, centre of the table               |
| `shape`     | `rectangle` or `round`                                            |
| `size`      | `{ width, height }` in millimetres, on a `rectangle` table        |
| `diameter`  | Millimetres, on a `round` table, instead of `size`                |
| `rotation`  | Degrees clockwise                                                 |
| `seats`     | Seating capacity                                                  |
| `enabled`   | Whether the table is in service                                   |
| `qrTokenId` | Reference to the active opaque QR token, absent before publishing |

`size` and `diameter` are alternatives rather than both being optional: a round table has no width and height to disagree about, and allowing both would let a plan describe an ellipse no renderer has a rule for.

## Live Table State

Stored separately from the Table. Proposed states:

| State             | Meaning                                         |
| ----------------- | ----------------------------------------------- |
| `available`       | Free and ready                                  |
| `reserved`        | Held for an expected party                      |
| `occupied`        | A party is seated                               |
| `ordering`        | An order is in progress                         |
| `awaitingPayment` | The bill has been requested or is being settled |
| `cleaning`        | Being turned over                               |
| `disabled`        | Temporarily blocked                             |

Allowed transitions:

```text
available       -> reserved | occupied | cleaning | disabled
reserved        -> occupied | available | disabled
occupied        -> ordering | awaitingPayment | cleaning | available
ordering        -> awaitingPayment | occupied | cleaning
awaitingPayment -> cleaning | available
cleaning        -> available | disabled
disabled        -> available
```

A Table with no state document is treated as `available`. Every transition is applied by the backend, validated against this matrix, and recorded with actor and timestamp, so two staff members acting at once produce one outcome and a disputed table has a history.

## Relationships

```text
Restaurant
|-- Room
    |-- Table
        |-- Table state (live, separate document)
        |-- QR token
        |-- Table visits
            |-- Orders
```

## Lifecycle

```text
Owner places the table in the floor plan
|
Owner assigns label, capacity, and enabled state
|
Plan is published
|
QR token is generated and printed
|
Staff seat a party, opening a visit
|
Guest scans, joins the visit, and orders
|
Visit is paid and closed
|
Table returns to an available state
```

## Permissions

- Guest: resolve one Table through a valid QR token and see restaurant, room, and table label. No other table data.
- Restaurant staff: read tables, read and change live table state, open and close visits. No floor-plan writes.
- Restaurant owner: full configuration of tables, labels, capacities, enablement, and QR rotation.
- Admin: read for support. Configuring tables is restaurant maintenance, and `admin` does not imply `business` (issue \#1164), so a change goes through the assigned owner.

## Use Cases

- [[UC - Configure Restaurant Floor Plans And Tables]]
- [[UC - Order At The Table Through A QR Code]]

## Related Epics

- Issue \#1070 - Restaurant floor plan and table configuration
- Issue \#1071 - Staff table management and live table state
- Issue \#1072 - QR table menu and table ordering

## Technical Implementation

Planned Firestore layout:

```text
/restaurants/{restaurantId}/tables/{tableId}
/restaurants/{restaurantId}/tableStates/{tableId}
/tableTokens/{token}
```

`/tableTokens/{token}` is top-level and publicly readable so a scan resolves in a single read. It exposes only what a scan needs and is never client-writable.

The shared type is `RestaurantTable` in `libs/bite-tribe-common/model/src/lib/restaurant-table.ts`, added by issue \#1080. It is named for its restaurant rather than as `Table`, because `Table` is taken by the DOM library in every consumer. Per `RD-GL-4` that is a code identifier and not a competing domain term. It is a union discriminated on `shape`, and its geometry follows the coordinate system on [[Floor Plan]].

Issue \#1081 added the persistence. A table is one document per table rather than a subcollection of its room, because a table keeps its identity when it moves between rooms: `roomId` is a field, so a move is a field change rather than a delete and recreate of the document a QR token, visits, and orders point at. Tables carry no `version`: the concurrent edit that can silently lose work is the room geometry two devices each hold a whole copy of, while a table is one small document changed by one deliberate action. Writes go through `FloorPlanDataAccessService`, which stores the fields of the shape a table actually has, so switching a round table to a rectangle drops the diameter rather than leaving a document that describes two shapes.

Issue \#1083 made the editor the first writer. A table placed on the plan is given its id by the client rather than by Firestore, which is what lets it be dragged, duplicated and undone before it is ever saved: an id assigned on write would mean the editor holding an object it cannot name, and the undo history is keyed on ids. `saveTable` writes at that id, and the rules accept it because they authorise the account against the restaurant rather than the document name. A save writes only the tables whose fields actually differ from the ones that were read, compared field by field - a table read from Firestore and one built in the editor carry the same fields in a different order, so a serialised comparison would rewrite every table on every save.

## Current Limitations

- A table is placed but not yet described. Issue \#1083 put the two table shapes in the editor's palette, so the owner can place, move, resize, rotate, duplicate and delete a table on the plan, and a placed table is written as a real document with a generated label and four seats. Every field that makes it a business entity rather than a rectangle - its number, its capacity, its shape, its enabled state and the uniqueness rule behind the label - is issue \#1084, and nothing in the editor edits them yet.
- The generated label is a placeholder, not a guarantee. It is the smallest unused number among the tables of the _open room_, because that is what the editor holds; uniqueness across the restaurant is issue \#1084 and the publish validation of issue \#1088.
- `qrTokenId` is writable by the owner like any other field. Making it backend-only belongs with the tokens themselves, in issue \#1086, because there is nothing to protect until something issues one.
- A QR code identifies a table context. It does not prove that the guest is physically present, and no design should assume otherwise.
- Presence hardening such as rotating codes, staff confirmation, and session expiry is planned in issue \#1107, not guaranteed by the token itself.

## Future Ideas

- Reservation holds on specific tables
- Table merge and split for large parties
- Turnover and occupancy analytics per table

## Sources Used

- [[Floor Plan]]
- [[Table Visit]]
- [[Restaurant]]
