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
| `size`      | `{ width, height }` in millimetres, or diameter for a round table |
| `shape`     | `rectangle` or `round`                                            |
| `rotation`  | Degrees clockwise                                                 |
| `seats`     | Seating capacity                                                  |
| `enabled`   | Whether the table is in service                                   |
| `qrTokenId` | Reference to the active opaque QR token                           |

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
- Admin: full access for support.

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

## Current Limitations

- Not implemented yet.
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
