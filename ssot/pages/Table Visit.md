# Table Visit

## Purpose

A Table Visit represents a party at a table over a period of time.

It is the entity that orders, payments, and eventually Bites hang from. Attaching orders to a visit rather than directly to a table is what allows a party to move tables without losing what they ordered.

## Why It Exists

A table is a place. A visit is what happens there. Without a visit, a restaurant cannot answer:

> Who is at this table right now, what have they ordered, and have they paid?

The Table Visit is also the bridge back to the core product: the dishes ordered during a visit become the best-sourced Bites BiteTribe can produce.

## Business Rules

- A Table Visit belongs to one Restaurant and to one Table at a time.
- A Table has at most one open visit at a time, enforced by the backend.
- Seating a party opens a visit. Freeing the table closes it.
- A visit can be moved to a different Table while keeping its identity and its orders.
- Multiple guests can join the same visit by scanning the same table QR code. Proposed, see open questions.
- A guest scan does not open a visit by itself. It raises a pending signal that staff confirm. Proposed, see open questions.
- A guest may participate without a BiteTribe account, through anonymous authentication. Proposed, see open questions.
- A session expires when the visit closes, or after a configurable idle timeout.
- Closing a visit with an unpaid bill requires explicit staff confirmation.
- A visit is retained after it closes, because it becomes the receipt context and the Bite-creation entry point.
- A visit survives the deletion of its Table, keeping the historical record readable.

## Required Data

| Field            | Description                                       |
| ---------------- | ------------------------------------------------- |
| `id`             | Unique visit identifier                           |
| `restaurantId`   | Owning restaurant                                 |
| `tableId`        | Current table                                     |
| `status`         | `open`, `closed`, `abandoned`                     |
| `openedAt`       | When the party was seated                         |
| `closedAt`       | When the visit ended                              |
| `guestCount`     | Party size                                        |
| `openedByUserId` | Staff member who seated the party                 |
| `closedByUserId` | Staff member who closed the visit                 |
| `paymentStatus`  | `unpaid`, `pending`, `paid`, `failed`, `refunded` |

## Orders

An Order belongs to a visit, not to a table.

| Field            | Description                                                 |
| ---------------- | ----------------------------------------------------------- |
| `id`             | Unique order identifier                                     |
| `status`         | `submitted`, `accepted`, `preparing`, `served`, `cancelled` |
| `items`          | Order lines                                                 |
| `submittedAt`    | Submission timestamp                                        |
| `idempotencyKey` | Prevents duplicate submission on a flaky network            |

An order line snapshots the menu item at the moment of submission: item id, name at time of order, price at time of order, currency, variant, quantity, and notes. The snapshot is immutable once submitted, so the price the guest saw is the price they are charged, even if the menu changes mid-session.

This requires stable menu item identifiers, which do not exist today. `MenuItem` in `libs/bite-tribe-common/model/src/lib/menu.ts` has no `id`; items are array entries addressable only by name and index. Issue \#1099 adds them.

## Relationships

```text
Restaurant
|-- Table
    |-- Table Visit
        |-- Orders
            |-- Order lines (menu item snapshots)
        |-- Payment
        |-- Bites created from ordered dishes
```

## Lifecycle

```text
Staff seat a party -> visit opens
|
Guests scan the table QR code and join the visit
|
Guests browse the menu and submit orders
|
Staff accept, prepare, and serve
|
Guest requests the bill or pays in the app
|
Visit closes and the receipt is retained
|
Guest creates a Bite from a dish they ordered
```

## Permissions

- Guest: join a visit at a table they scanned, see the visit's orders and total, submit orders, request assistance and the bill, and later create a Bite from a dish. No access to other visits.
- Restaurant staff: open, move, and close visits, change order status, cancel with a reason, and confirm payment.
- Restaurant owner: everything staff can do, plus configuration.
- Admin: full access for support.

## Use Cases

- [[UC - Order At The Table Through A QR Code]]
- [[UC - Create And Maintain Personal Bites]] - a visit becomes a prefilled Bite

## Related Epics

- Issue \#1071 - Staff table management and live table state
- Issue \#1072 - QR table menu and table ordering
- Issue \#1073 - Table payment and Bite creation from orders

## Technical Implementation

Planned Firestore layout:

```text
/restaurants/{restaurantId}/visits/{visitId}
/restaurants/{restaurantId}/visits/{visitId}/orders/{orderId}
```

## Current Limitations

- Not implemented yet.
- Several of the business rules above are proposals awaiting a product decision. They are listed in [[Current State - Open Questions]].
- Payment behaviour is undecided until the ADR from issue \#1109 exists. Whether BiteTribe is ever in the money flow changes the architecture.

## Future Ideas

- Split billing per guest within a visit
- Pre-ordering before arrival
- Visit history as a personal food diary

## Sources Used

- [[Table]]
- [[Floor Plan]]
- [[Restaurant]]
- [[Bite]]
