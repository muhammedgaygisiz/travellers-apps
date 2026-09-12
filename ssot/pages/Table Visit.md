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
- Ending a visit leaves its Table in `cleaning` and never in `available`, so the next party cannot be seated at it without somebody looking at it first.
- Ending a visit is one-way. A closed visit is never reopened; the party that comes back for a coffee is a new party at that table.

## Required Data

| Field            | Description                                          | State                    |
| ---------------- | ---------------------------------------------------- | ------------------------ |
| `id`             | Unique visit identifier, stable across a move        | Implemented, issue #1095 |
| `restaurantId`   | Owning restaurant                                    | Implemented, issue #1095 |
| `tableId`        | Current table, a plain id so it outlives the table   | Implemented, issue #1095 |
| `status`         | `open`, `closed`, `abandoned`                        | Implemented, issue #1095 |
| `openedAt`       | When the party was seated, epoch milliseconds        | Implemented, issue #1095 |
| `closedAt`       | When the visit ended. Absent while open              | Implemented, issue #1095 |
| `guestCount`     | Party size. Optional, absent rather than `0`         | Implemented, issue #1095 |
| `openedByUserId` | Staff member who seated the party                    | Implemented, issue #1095 |
| `closedByUserId` | Staff member who closed the visit. Absent while open | Implemented, issue #1095 |
| `paymentStatus`  | `unpaid`, `pending`, `paid`, `failed`, `refunded`    | Proposed, issue #1073    |

`guestCount` is optional because a host tapping a table mid-rush has not been
asked for a number, and refusing the seating over it would cost more than the
field is worth. Absent means nobody recorded one, which is true; `0` would be a
party of nobody.

`paymentStatus` is not a field yet. Whether BiteTribe is ever in the money flow
is undecided until the ADR of issue \#1109 exists, and a status enum written
before that decision would be a shape the decision then has to migrate.

## Lifecycle Operations

| Operation | How                                                                         |
| --------- | --------------------------------------------------------------------------- |
| Open      | `transitionTableState` into `occupied` from a status that held no party     |
| Carry     | `transitionTableState` between `occupied`, `ordering` and `awaitingPayment` |
| End       | `transitionTableState` out of the party statuses, into `cleaning`           |
| Move      | `moveTableVisit`, keeping the visit id and its orders                       |

Seating a table **is** opening a visit and freeing it **is** ending one. They
are not two actions a host has to remember to pair: one transition writes the
state, the audit entry and the visit in one commit, so a table occupied by
nobody cannot exist and a party cannot outlive the state that points at it.

A table has at most one open visit, and nothing checks it. `TableState.visitId`
is the only pointer at an open visit: the commit that seats a table writes it and
the commit that frees the table drops it, so a second visit at one table would
take a second seating of a table that is already `occupied` - which loses its
`expectedStatus` check against the one document both hosts contend on. Asking
`visits` who is open where would be a second answer to a question the state
already answers, free to disagree with it.

A visit ends as `closed` by default and as `abandoned` when the caller says so -
the table found still open at the end of service, or the party that walked out.
The two are kept apart because a bill reconciled and a bill nobody ever looked
at are different facts, and the payment of issue \#1073 charges for one of them.

## Where A Visit's History Lives

The tables a party sat at are **not** a field on the visit. They are
`tableStateTransitions`, the append-only trail of issue \#1092, whose entries
carry the `visitId` they moved - so "which tables did this party sit at tonight"
is one `where` on `visitId`. A list copied onto the visit would be a second
version of one fact, free to disagree with the trail a disputed evening is
actually read from.

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

That shape exists. Issue \#1099 added `OrderLineSnapshot` to `libs/bite-tribe-common/model/src/lib/order-line.ts`, with every field `readonly`, and gave `MenuItem`, `Category` and every variant the `id` it references. `menuItemId` names the dish rather than the variant - "large Margherita" and "small Margherita" are one thing on the menu - and `variantId` says which size, so a line renders as two fields rather than one string a reader has to take apart.

The snapshot is what makes a line survive its dish. `findMenuItemById` answers `undefined` for an item that has since been deleted, which is an ordinary outcome rather than an error: the link goes and the record stays, so a receipt from before the deletion reads exactly as it did. Nothing writes one yet - the order collection and the submission callable are issue \#1103.

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

Firestore layout. The first line exists; the second is issue \#1072.

```text
/restaurants/{restaurantId}/visits/{visitId}
/restaurants/{restaurantId}/visits/{visitId}/orders/{orderId}
```

Under the restaurant and not under the table, which is the whole of how a visit
survives its table being deleted from the floor plan: a subcollection of the
table goes when the table goes.

The model is `libs/bite-tribe-common/model/src/lib/table-visit.ts`. Firebase
Functions cannot import the library - `rootDir: src`, no path mappings, a deploy
that uploads `lib/` alone - so `restaurants/table-visit.ts` holds a copy and
`src/__specs__/table-visit-parity.spec.ts` compares the statuses, the set that
ends a visit and `TABLE_STATUS_AFTER_VISIT` as text.

`firestore.rules` refuses every client write to `visits` and admits exactly the
readers of the published plan. `transitionTableState` and `moveTableVisit` write
through the Admin SDK, which bypasses rules, so the callables are not the path
the app takes but the only path there is.

## Current Limitations

- The model, the storage and the backend exist (issue \#1095). **No app surface uses them yet.** The staff view of issue \#1093 and the actions of issue \#1094 read and write live table state, so seating a table already opens a visit, but nothing shows the visit, its party size or its duration, and nothing calls `moveTableVisit`.
- The party size is therefore never recorded through the UI. The sheet of issue \#1094 takes an optional count and writes it to the audit entry's `reason`; moving it onto `TableVisit.guestCount`, which now exists to hold it, is left to the surface that consumes visits.
- Orders do not exist. `/restaurants/{restaurantId}/visits/{visitId}/orders` is issue \#1072, and until it does, "the party keeps its orders when it moves" is a property of the identity rather than something with data behind it.
- `firestore.rules` admits only the readers of the published plan. A guest reading their own visit needs the scanned session of issue \#1072 and has no rule yet.
- Rules are deployed by hand. Merging a change to `firestore.rules` changes nothing in production until somebody runs the deploy - see [[Architecture - Firebase]].
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
