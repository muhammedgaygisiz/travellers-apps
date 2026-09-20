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
- Multiple guests can join the same visit by scanning the same table QR code. Decided, `RD-TS-3`.
- A guest scan does not open a visit by itself. It raises a pending signal that staff confirm. Decided, `RD-TS-1`.
- A guest may participate without a BiteTribe account, through anonymous authentication. Decided, `RD-TS-4`.
- A session expires when the visit closes, or after a configurable idle timeout. Decided, `RD-TS-5`.
- Closing a visit with an unpaid bill requires explicit staff confirmation.
- A visit is retained after it closes, because it becomes the receipt context and the Bite-creation entry point.
- A visit survives the deletion of its Table, keeping the historical record readable.
- Ending a visit leaves its Table in `cleaning` and never in `available`, so the next party cannot be seated at it without somebody looking at it first.
- Ending a visit is one-way. A closed visit is never reopened; the party that comes back for a coffee is a new party at that table.

## Required Data

| Field            | Description                                          | State                      |
| ---------------- | ---------------------------------------------------- | -------------------------- |
| `id`             | Unique visit identifier, stable across a move        | Implemented, issue [#1095] |
| `restaurantId`   | Owning restaurant                                    | Implemented, issue [#1095] |
| `tableId`        | Current table, a plain id so it outlives the table   | Implemented, issue [#1095] |
| `status`         | `open`, `closed`, `abandoned`                        | Implemented, issue [#1095] |
| `openedAt`       | When the party was seated, epoch milliseconds        | Implemented, issue [#1095] |
| `closedAt`       | When the visit ended. Absent while open              | Implemented, issue [#1095] |
| `guestCount`     | Party size. Optional, absent rather than `0`         | Implemented, issue [#1095] |
| `openedByUserId` | Staff member who seated the party                    | Implemented, issue [#1095] |
| `closedByUserId` | Staff member who closed the visit. Absent while open | Implemented, issue [#1095] |
| `paymentStatus`  | `unpaid`, `pending`, `paid`, `failed`, `refunded`    | Proposed, issue [#1073]    |

`guestCount` is optional because a host tapping a table mid-rush has not been
asked for a number, and refusing the seating over it would cost more than the
field is worth. Absent means nobody recorded one, which is true; `0` would be a
party of nobody.

`paymentStatus` is not a field yet. Whether BiteTribe is ever in the money flow
is undecided until the ADR of issue [#1109] exists, and a status enum written
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
at are different facts, and the payment of issue [#1073] charges for one of them.

## Where A Visit's History Lives

The tables a party sat at are **not** a field on the visit. They are
`tableStateTransitions`, the append-only trail of issue [#1092], whose entries
carry the `visitId` they moved - so "which tables did this party sit at tonight"
is one `where` on `visitId`. A list copied onto the visit would be a second
version of one fact, free to disagree with the trail a disputed evening is
actually read from.

## Table Sessions

A visit is the party. A **Table Session** is one guest's attachment to it: one
document per phone, naming the visit it orders into.

They are deliberately not one record. A party of four with two phones out is one
visit and two sessions, and a guest who closes their browser must not end the
meal. Equally, a visit is opened by staff and a session is opened by a scan, and
those are different events with different authority behind them.

| Field              | Description                                             |
| ------------------ | ------------------------------------------------------- |
| `id`               | Equal to the document id, derived from the two below    |
| `restaurantId`     | Owning restaurant, repeated from the path               |
| `tableId`          | The table that was scanned. A plain id, as on the visit |
| `guestUserId`      | The account that scanned, anonymous or not              |
| `status`           | `pending`, `active`, `left`, `expired`, `closed`        |
| `visitId`          | The visit being ordered into. Absent while `pending`    |
| `startedAt`        | When the guest first scanned, epoch milliseconds        |
| `lastActiveAt`     | What the idle timeout is measured from                  |
| `endedAt`          | When it ended. Absent while `pending` or `active`       |
| `isAnonymousGuest` | Whether the guest had no account when it started        |

The five statuses are five sentences a guest is shown, which is why the three
endings are three statuses rather than one ending plus a reason field: "you
left", "you were away too long" and "your table was closed" are different facts,
and a two-field state is a state two readers can disagree about.

`pending` is the one that carries the product decision. It is _live_ - the
session is still the guest's and has not ended - and it still cannot order,
because staff have not confirmed anybody is at that table. Reading "may order"
as "has not ended" is exactly the hole `RD-TS-1` closes.

### The lifecycle, and who moves it

| Transition            | Written by                                |
| --------------------- | ----------------------------------------- |
| → `pending`           | `startTableSession`, table not seated     |
| → `active` on arrival | `startTableSession`, table already seated |
| `pending` → `active`  | `transitionTableState`, opening the visit |
| `pending` → `expired` | `transitionTableState`, idle when seated  |
| → `left`              | `leaveTableSession`                       |
| → `closed`            | `transitionTableState`, ending the visit  |
| → `expired`           | Whichever callable next observes it       |

Nothing else writes one, and `firestore.rules` refuses every client write.

**Leaving is one phone leaving.** `leaveTableSession` touches neither the visit,
the table, nor anybody else's session: the friend still at the table is still
ordering, and the party is still the restaurant's to close. A guest who could
end a visit by tapping "leave" could clear a table they were never sitting at,
since the QR code never proved they were.

**Expiry is computed rather than swept.** `isTableSessionExpired` is a pure
predicate over `lastActiveAt` and the restaurant's
`TableOrderingSettings.sessionIdleTimeoutMinutes`, and the next callable that
observes an expired session persists the status. There is no scheduled job,
because a session nobody touches costs nothing and matters to nobody; the moment
expiry matters is the moment somebody asks.

### Storage

```text
/restaurants/{restaurantId}/tableSessions/{length}_{tableId}_{guestUserId}
```

Under the restaurant rather than under the visit, because a `pending` session has
no visit to live under, and moving the document once it gained one would change
the id a guest is already watching.

The name is derived rather than generated, which is what makes re-scanning
idempotent: one phone scanning one code twice addresses one document instead of
opening a second session. The leading length is what makes the derivation
injective - with a plain separator, `table_` with `guest` and `table` with
`_guest` name the same document, and two guests at one table would share a
session. Neither generator produces such an id today, which is an accident of a
v4 UUID and an alphanumeric uid rather than a rule anybody stated.

The guest reads their own by `get` and never by `list`: the phone derives the
name and subscribes to it, which is the whole reason a guest signs in
anonymously rather than being handed an opaque secret to replay. `list` would
hand them the other people at their table. Staff list them through the same
`readsFloorPlan` as the tables, their live state and the visits.

## Orders

An Order belongs to a visit, not to a table.

| Field                   | Description                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | Unique order identifier, equal to the document id                                                                                  |
| `restaurantId`          | Repeated from the path so a query can filter it                                                                                    |
| `visitId`               | The visit this order belongs to, which is also the parent document                                                                 |
| `tableId`               | Where the party was sitting when they sent it. A record, not an address                                                            |
| `sessionId`             | The session that placed it                                                                                                         |
| `guestUserId`           | The phone that placed it, anonymous or not (`RD-TS-9`)                                                                             |
| `status`                | `submitted`, `accepted`, `preparing`, `served`, `cancelled`                                                                        |
| `lines`                 | Order lines, as `OrderLineSnapshot`                                                                                                |
| `currency`              | ISO 4217, read off the menu and equal on every line                                                                                |
| `total`                 | `tableOrderTotal(lines)` at the moment of writing                                                                                  |
| `submittedAt`           | Submission timestamp, in epoch milliseconds                                                                                        |
| `statusChangedAt`       | When `status` last changed. Equal to `submittedAt` on a new order                                                                  |
| `statusChangedByUserId` | The staff account that last moved `status`. Absent until one has                                                                   |
| `cancellationReason`    | Why the restaurant cancelled it, in the words staff used. Only on `cancelled`                                                      |
| `requestId`             | The phone's idempotency key, which is also what the document is named after. Absent on an order placed by a client that sends none |

An order line snapshots the menu item at the moment of submission: item id, name at time of order, price at time of order, currency, variant, quantity, and notes. The snapshot is immutable once submitted, so the price the guest saw is the price they are charged, even if the menu changes mid-session.

That shape exists. Issue [#1099] added `OrderLineSnapshot` to `libs/bite-tribe-common/model/src/lib/order-line.ts`, with every field `readonly`, and gave `MenuItem`, `Category` and every variant the `id` it references. `menuItemId` names the dish rather than the variant - "large Margherita" and "small Margherita" are one thing on the menu - and `variantId` says which size, so a line renders as two fields rather than one string a reader has to take apart.

The snapshot is what makes a line survive its dish. `findMenuItemById` answers `undefined` for an item that has since been deleted, which is an ordinary outcome rather than an error: the link goes and the record stays, so a receipt from before the deletion reads exactly as it did.

Issue [#1103] gave it a writer. `submitTableOrder` is the only one, and it revalidates before it writes anything: the session must be `active` and not idle, the visit must still be open and must be the one the table's state points at, the restaurant must still be taking orders, and every line must name a dish that is still on the menu, still being served, and still at the price the guest's phone displayed. A difference on any of those refuses the whole order and names the item (`RD-TS-10`). The order and the table's move to `ordering` land in one commit (`RD-TS-11`), and `firestore.rules` refuses every client write to the collection - so the status lifecycle above is a restaurant's to move and never a guest's.

Issue [#1108] gave the same writer a memory. A submission carries a key the phone mints once per tap, and the key **names the order document** - so the second copy of one request reads the first one's document instead of writing a second, and two copies racing each other contend on it because the read is inside the transaction. The replay is answered before the session status, the visit, the table and the lines are checked, because it arrives after the world has moved on and none of that makes the order that already landed untrue (`RD-TS-29`, `RD-TS-30`). The answer says `replayed`, so a guest who tapped once is not told twice that they have ordered.

The status transitions are declared as data in `table-order.ts`, in both the library and the backend copy, with `src/__specs__/table-order-parity.spec.ts` comparing the statuses, the end set, every row of the matrix, the refusal reasons and the total as text. A row the staff queue of issue [#1105] believes is legal and the backend refuses would otherwise be a button that does nothing.

Issue [#1104] gave the guest a reader. `firestore.rules` admits a guest to `list` the orders of a visit **only when the query names their own uid**, so the phone sends `where('guestUserId', '==', uid)` and a query without it is refused whole rather than quietly shortened - which is what makes "their own orders, not the party's" a rule rather than a habit of one call site (`RD-TS-12`). The screen subscribes to that query and to the guest's own session document beside it, and reads the visit id off the session: an order id is generated, so a phone that reloads holds nothing to derive one from, and the derived session name is the one thing it can always find its way back through.

`TableOrder.cancellationReason` is declared by the same issue and filled by issue [#1105]'s staff cancellation (`RD-TS-13`). An absent one is ordinary rather than a gap - a kitchen mid-rush is not always going to type a sentence, so the screen names the cancellation either way and adds the reason where there is one.

Issue [#1105] gave the status a writer. `transitionTableOrderStatus` is the only one: it validates the move against the matrix, applies it in a transaction against the status the caller says it saw, and updates four fields - `status`, `statusChangedAt`, `statusChangedByUserId` and, on a cancellation and nowhere else, `cancellationReason`. The lines, the prices, the total, the visit and the guest are what the order **is**, which is the whole of "immutable except for its status" enforced rather than promised. Two members of staff pressing different buttons in the same second produce one change and one sentence naming what the order holds now, which is what `expectedStatus` is for - and is also why this callable needs no idempotency key where the table transition of issue [#1096] needed one.

The caller is admitted by `requireTableStateAuthority`, deliberately the same guard a table transition uses: operating a restaurant during service is one permission, and a second list of who may work the pass would be free to disagree with who may seat a table. A cancellation carries a reason of at most 200 characters, required when cancelling and refused on every other status (`RD-TS-16`) - a reason attached to a served dish would be a second, contradictory account of what happened to it.

Staff read them through a **collection group** rather than through the visit (`RD-TS-14`). `collectionGroup('orders').where('restaurantId', '==', id)`, with a second constraint narrowing to the open statuses, and a rule reading `resource.data.restaurantId` because a collection-group match has no `{restaurantId}` in its path. That makes the `where` the permission rather than a filter, in the way `RD-TS-12` makes the guest's own. It needs a collection-group index exemption, declared in `firestore.indexes.json` and deployed from CI with the rules ([#1567]).

## Calls For A Waiter

Issue [#1106] added the two things a guest most often needs a person for, and put
them **beside** the visit rather than under it.

```text
/restaurants/{restaurantId}/assistanceRequests/{n}_{tableId}_{kind}
```

Under the restaurant and named after the **table** and the kind, which is the
opposite of where an order lives and is the same fact read the other way
(`RD-TS-19`). An order is money and belongs to the party, so a party walked to
another table keeps it; a signal means _come to this table_, so a party that has
moved wants somebody at the new one and leaves the old signal behind. Both are
written against the visit's `tableId` rather than the one the guest scanned,
because that is where the party is sitting now.

The name is derived rather than generated (`RD-TS-18`), exactly as
`tableSessionId` names one guest at one table, and three things follow from it.
A repeated tap **addresses the first tap's document**, across phones as well as
across taps, which is what makes "repeated taps do not create repeated signals"
true of the address rather than of a check. The collection is **bounded by the
room** at two documents per table, so the staff screens read it whole with no
`where`, no index and no collection-group match. And the guest's phone can
**derive the name and subscribe**, which is what makes "received, then
acknowledged" a listener rather than a poll. What it costs is history: a new
request of the same kind at the same table replaces the answered one.

Two kinds and two statuses. `callStaff` draws a mark and nothing else;
`requestBill` also writes `awaitingPayment` on the table in the same commit
(`RD-TS-21`), which is what stops the table taking further orders - a dish added
after the bill was asked for is a conversation rather than a tap. `open` becomes
`acknowledged` through `acknowledgeTableAssistance` and never back; a second
press answers with the stored values rather than with a conflict, because an
acknowledgement has one destination and two people pressing it both wanted what
happened (`RD-TS-22`).

Neither callable checks whether the kitchen is taking orders. A restaurant that
has closed, paused, or never took orders at the table has nothing to do with
whether somebody in the dining room may ask for the bill - and the moment they
most need to is after the kitchen shuts. What both check is the **party**: an
active session, an open visit, and a table the floor agrees somebody is sitting
at. A `pending` session is refused, because making that visible to the floor is
issue [#1107]'s.

The rate limit is the name plus one clock (`RD-TS-20`): a signal raised within a
minute of the last one of that kind at that table is refused, with the moment it
may be asked for again. Measured from when it was **raised** rather than from
when it was answered, so a restaurant that answers in ten seconds does not lock
the table out for the following fifty. Joining a signal that is still open is not
rate limited at all.

The statuses, the kinds, the refusal reasons, the cooldown, the collection name
and the id derivation are declared as data in `table-assistance.ts`, in both the
library and the backend copy, with `src/__specs__/table-assistance-parity.spec.ts`
comparing them as text. The id is the one that drifts worst: it is computed on
both sides, so a separator changed in one file leaves a guest watching a document
nothing ever writes while the restaurant sees a mark the guest is never told
about.

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
Guests scan the table QR code -> pending sessions
|
Staff seat a party -> visit opens, pending sessions become active
|
Guests browse the menu and submit orders
|
Staff accept, prepare, and serve, the guest watching it happen and ordering again
|
Guest requests the bill or pays in the app
|
Visit closes and the receipt is retained
|
Guest creates a Bite from a dish they ordered
```

## Permissions

- Guest: join a visit at a table they scanned, see the visit's orders and total, submit orders, request assistance and the bill, and later create a Bite from a dish. No access to other visits, and no access to the sessions of the other guests at their own table.
- Restaurant staff: open, move, and close visits, change order status, cancel with a reason, and confirm payment.
- Restaurant owner: everything staff can do, plus configuration.
- Admin: full access for support.

## Use Cases

- [UC - Order At The Table Through A QR Code](../use-cases/uc-order-at-the-table-through-a-qr-code.md)
- [UC - Create And Maintain Personal Bites](../use-cases/uc-create-and-maintain-personal-bites.md) - a visit becomes a prefilled Bite

## Related Epics

- Issue [#1071] - Staff table management and live table state
- Issue [#1072] - QR table menu and table ordering
- Issue [#1073] - Table payment and Bite creation from orders

## Technical Implementation

Firestore layout. All three exist.

```text
/restaurants/{restaurantId}/visits/{visitId}
/restaurants/{restaurantId}/tableSessions/{sessionId}
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
the app takes but the only path there is. The orders subcollection follows the
same shape, with one addition: a guest may read their own orders, by the
`guestUserId` on the stored document, exactly as they read their own session.
Issue [#1103] gave them `get`; issue [#1104] added a `list` conditioned on that same
field, which Firestore admits only against a query that names the caller - so the
rest of the party's dinner stays private without a second rule saying so, while
staff keep an unconditional `list` over the whole table.

## Current Limitations

- **Nothing shows staff a pending session.** Issue [#1101] writes the signal and the rules admit every reader of the floor plan to it, but the business app does not render it. Until something does, "a scan raises a signal staff confirm" is a signal no screen draws, and a guest who scans an unseated table waits for a confirmation nobody has been asked for. Recorded in [Current State - Open Questions](../current-state/open-questions.md).
- **Nothing writes `sessionIdleTimeoutMinutes`.** Every restaurant therefore uses the two-hour default, which is the intended default rather than a gap - but a restaurant that wants a shorter one has no way to say so.
- The model, the storage and the backend exist (issue [#1095]). **No app surface uses them yet.** The staff view of issue [#1093] and the actions of issue [#1094] read and write live table state, so seating a table already opens a visit, but nothing shows the visit, its party size or its duration, and nothing calls `moveTableVisit`.
- The party size is therefore never recorded through the UI. The sheet of issue [#1094] takes an optional count and writes it to the audit entry's `reason`; moving it onto `TableVisit.guestCount`, which now exists to hold it, is left to the surface that consumes visits.
- **An order placed before a party moved stays grouped under the table it was ordered from.** Issue [#1105]'s queue groups by `TableOrder.tableId`, which is what the kitchen wrote on the ticket and is right for the pass; it is not what a waiter carrying the plates reads, and nothing yet says "this party is now at table 9". Recorded in [Current State - Open Questions](../current-state/open-questions.md).
- **A signal keeps no history.** Issue [#1106]'s derived document name means a new request of the same kind at the same table replaces the answered one, so "how often did table 12 have to ask for a waiter last Saturday" is not a question this collection can answer. The one durable consequence a request has - the table moving to `awaitingPayment` - is in `tableStateTransitions`, which nothing overwrites.
- **Indexes deploy from CI, like the rules** ([#1567]). Issue [#1105]'s queue query is a collection group and Firestore creates no exemption for one on its own, so the declaration in `firestore.indexes.json` is what production gets - on merge, and with the deploy waiting for the index to finish building. Before [#1567] this was a workstation command, and a queue opened against a missing exemption was refused rather than empty.
- **An order sent twice creates one order** (issue [#1108]). The phone mints a key once per tap and reuses it on every attempt, and `submitTableOrder` writes the order at `visits/{visitId}/orders/req-{requestId}` - so a replay reads the document it would write rather than creating a second one, and is answered before the session, the visit, the table and the lines are looked at. The field is called `requestId` rather than `idempotencyKey`, matching the transition trail of issue [#1096]. What is still unowned is a **guest whose party was moved**: the order follows the visit, and the retry that finds it names the table it was ordered from.
- **A guest's phone cannot read the visit, and no longer needs to.** Issue [#1104] decided it (`RD-TS-12`): the running total on the guest's screen is a sum over their own orders, cancelled ones excluded, and the shared bill is settled at the table. What a guest is shown when their party is **moved** is still unowned - the session goes on naming the table they scanned, and nothing tells them the table number on their screen has changed.
- Rules deploy from CI on every push to `develop` ([#1567]), gated on the rules emulator suite - see [Architecture - Firebase](../architecture/firebase.md).
- Several of the business rules above are proposals awaiting a product decision. They are listed in [Current State - Open Questions](../current-state/open-questions.md).
- Payment behaviour is undecided until the ADR from issue [#1109] exists. Whether BiteTribe is ever in the money flow changes the architecture.

## Future Ideas

- Split billing per guest within a visit
- Pre-ordering before arrival
- Visit history as a personal food diary

## Sources Used

- [Table](table.md)
- [Floor Plan](floor-plan.md)
- [Restaurant](restaurant.md)
- [Bite](bite.md)

[#1071]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1071
[#1072]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1072
[#1073]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1073
[#1092]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1092
[#1093]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1093
[#1094]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1094
[#1095]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1095
[#1096]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1096
[#1099]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1099
[#1101]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1101
[#1103]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1103
[#1104]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1104
[#1105]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1105
[#1106]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1106
[#1107]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1107
[#1108]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1108
[#1109]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1109
[#1567]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1567
