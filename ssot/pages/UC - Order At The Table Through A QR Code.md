# UC - Order At The Table Through A QR Code

## Status

**Level:** L1

Partly implemented. Specified through issue \#1072 as stage 3 of issue \#735, and issue \#1073 as stage 4.

Seven of the ten children have landed. Issue \#1099 gave menu items the identity
an order line hangs from; issue \#1100 made a scanned token resolve, validating
the six rules below and answering with a restaurant, a room, a table and a menu
or one of twelve distinct refusal reasons; issue \#1101 gave the guest a
screen, a session and an identity to hold it with; issue \#1103 gave them a
cart and a way to send it; issue \#1104 gave them a way to watch what happens
to it and to order again; and issue \#1105 gave the restaurant the screen that
answers them.

**A scanned code now reaches something.** `/t/:token` is a public route in the
consumer app, the twelve refusal reasons have copy in all eleven locale files,
and a guest who confirms the table is signed in anonymously and attached to the
table's visit - or, when staff have not seated it, to a pending session that
says so. The four product decisions this use case was waiting on are settled and
recorded as `RD-TS-1` to `RD-TS-5` in [[Recorded Decisions]].

**Issue \#1102 closed the larger of the two gaps.** A restaurant can now turn
table ordering on, from its profile page in the business app, so the flag issue
\#1100 gated every scan on finally has a writer. The same issue made a menu
readable without an account at `/m/{restaurantId}`, which is what \#370 and
\#371 asked for, and it settled what a scan at a restaurant that takes no orders
should do: show the way to the menu rather than tell the guest to ask a waiter.

**Issue \#1103 closed the middle of the flow.** A guest with an active session
builds a cart at `/t/{token}/order` and sends it to `submitTableOrder`, which
revalidates the session, the visit, the table, the restaurant's ordering
availability and every line against the live menu before it writes anything. The
order lands under the visit rather than the table, and the same commit moves the
table to `ordering`. The three decisions that shaped it are `RD-TS-9` to
`RD-TS-11`.

**Issue \#1104 closed the guest's end of the loop.** The ordering screen lists
the orders this phone has sent into the visit, live, with their status, their
lines and a running total across them; a cancellation is named and carries the
reason where staff gave one; and a table that stops taking orders withdraws the
send button within seconds rather than refusing a cart the guest has already
built. Two decisions shaped it, `RD-TS-12` and `RD-TS-13`.

**Issue \#1105 closed the restaurant's end of the loop.** Orders reach a queue at
`restaurant/{id}/orders`, grouped by table and newest first, each row carrying
its whole ticket and the time since the guest sent it; staff accept, start
preparing, serve, or cancel with a reason the guest is shown; the room view
badges each table with what the kitchen still owes it; and a new order reaches
the people on shift as a push through the existing notification infrastructure,
with a per-device audible alert that is off until somebody turns it on. Four
decisions shaped it, `RD-TS-14` to `RD-TS-17`.

**One gap remains, and it is staff-facing.** Nothing shows staff a **pending
session** - the guest who scanned while waiting to be seated - which sits with
issue \#1107. Table ordering is off for every restaurant until an owner turns it
on, and what still has to happen before one should is the deploy: the rules and
the indexes this issue adds are applied by hand, so a queue opened against
production today would be refused until
`npx nx firebase-deploy-rules bite-tribe-firebase` and
`npx nx firebase-deploy-indexes bite-tribe-firebase` have run.

## Goal

A guest at a table scans a BiteTribe QR code, sees the right menu for the right table, places an order, pays, and can turn the dishes they actually ordered into Bites.

## Actors

- Restaurant guest, with or without a BiteTribe account
- Restaurant staff handling incoming orders
- BiteTribe user creating a Bite afterwards

## Planned Flow

- The guest scans the QR code on the table.
- The backend resolves the opaque token to a restaurant, room, table, and menu.
- The guest confirms an unambiguous context screen: "You are ordering at Sakura Kitchen, table 12". Implemented, issue \#1101.
- The guest joins the table's open visit, or raises a pending signal that staff confirm. Implemented, issue \#1101.
- The guest browses the menu, with unavailable items marked and not addable, a variant of an unavailable dish included. Implemented, issues \#1102 and \#1103.
- The guest builds a cart and submits an order. Implemented, issue \#1103.
- Staff see the order in a queue attached to the correct table, accept it, and update its status. Implemented, issue \#1105.
- The guest watches each order move along its status, and is told when one is cancelled and why. Implemented, issues \#1104 and \#1105.
- The guest orders again into the same visit without rescanning. Implemented, issue \#1104.
- The guest requests assistance or the bill.
- The guest pays in the app or asks staff to settle, and the visit closes.
- The guest sees a receipt listing the dishes they ordered.
- The guest selects a dish and creates a Bite prefilled with restaurant, dish, price, and currency, adding only a photo, rating, and comment.

## Validation On Every Scan

`resolveTableQrToken` validates, in this order (issue \#1100):

| #   | Rule                                           | Refusal reasons                            | Next step          |
| --- | ---------------------------------------------- | ------------------------------------------ | ------------------ |
| 0   | The token exists                               | `unknownToken`                             | ask staff          |
| 1   | The restaurant exists and is active            | `restaurantNotFound`, `restaurantInactive` | ask staff          |
| 2   | Table ordering is enabled for that restaurant  | `tableOrderingDisabled`                    | ask staff          |
| 3   | The table exists, is published, and is enabled | `tableNotFound`, `tableDisabled`           | ask staff          |
| 4   | The QR token is active and not revoked         | `tokenSuperseded`, `tokenRevoked`          | rescan / ask staff |
| 5   | The restaurant is currently accepting orders   | `orderingPaused`, `restaurantClosed`       | try later          |
| 6   | The requested menu exists and is available     | `menuMissing`, `menuUnavailable`           | ask staff          |

Each failure returns a distinct, actionable reason, not a generic error, and the
reason carries the next step with it - ask staff, try later, or look at the
table again. A refusal is a returned value rather than a thrown error, because a
callable error code comes from a fixed list of sixteen that says nothing about
restaurants.

**The order is the contract.** Several rules are false at once often enough to
matter - a retired table at a restaurant that closed for the season and let its
assignment lapse fails three of them - and the guest gets one sentence, so which
one has to be decided here rather than by however an implementation nested its
conditions. It runs outside-in, so the answer is the largest true thing.

Three of the rules had no data behind them and now do. "Active" is not a field:
a restaurant is active while a business account holds it, which
`assignRestaurantOwner` and `revokeRestaurantOwner` already write. "Table
ordering is enabled" is `Restaurant.tableOrdering.enabled`, absent everywhere and
absent meaning off. "Currently accepting orders" is a staff-side
`pausedUntilTimestamp` **and** the opening hours evaluated in
`tableOrdering.timeZone` - `DaySchedule` carries no zone, and the server runs in
UTC, so without one a Jakarta restaurant would close at four in the afternoon.

A refusal never says more than it has to, and a resolution says only what the
guest needs: the restaurant's name and picture, the room's name, the table's
label and seats, and the menu's id. The answer is built field by field and is
never a spread of the documents it came from, so `ownerUserId` on the restaurant
and the floor-plan geometry on the table stay where they are.

## Key Behaviours

- A QR token is opaque and non-guessable, and never encodes the table number.
- A QR code identifies a table context. It does not prove the guest is physically present. The operational flow is designed so a remote scan cannot cause harm beyond a rejected or staff-visible pending session. Delivered by issue \#1101 and recorded as `RD-TS-1`: starting a session writes one document naming the guest and leaves the table's live state untouched, so what a scan from the car park costs the restaurant is one row on a screen.
- A guest is signed in **anonymously**, and an anonymous account is not a member (`RD-TS-4`). The uid is what the rules match the guest's own session document against and what `linkWith*` upgrades in place; it writes no `/users` document and does not pass the app's route guards.
- The confirmation screen is acknowledged before anything else is possible, because the sticker is a thing anybody can point a camera at - so a code swapped between two tables is caught by the person sitting at one of them rather than by the kitchen.
- An order belongs to a visit, not directly to a table, so a party that moves keeps its orders.
- Order lines snapshot the menu item name, price, and currency at submission, so the price the guest saw is the price they are charged. Delivered by issue \#1103 and recorded as `RD-TS-10`: the phone sends the prices it displayed, the backend compares each to the live menu, and a difference refuses the whole order naming the item and both prices - so what is stored is always the menu's number, and it is only ever stored when the two agree.
- Submission carries an idempotency key, so a double tap on a flaky restaurant network produces one order.
- A guest sees the orders **their own phone** sent, and not the party's (`RD-TS-12`). The bill is shared and is settled at the table; what the screen runs a total over is what this guest ordered, with cancelled orders excluded from it.
- An order's status is the **restaurant's** to move, and only along the matrix. `transitionTableOrderStatus` is the only writer of it, `firestore.rules` refuses every client write to the collection, and the transition matrix lives once in `libs/bite-tribe-common/model` with a checked copy in the Functions project - so the buttons the queue offers and the moves the backend accepts cannot disagree.
- An order is **immutable except for its status**. A correction is a cancellation with a reason, never a rewrite of the lines: a bill that can be edited after the fact is a bill nobody can dispute. The staff callable updates four fields and touches nothing the guest agreed to.
- **Cancellations are explained, not silent** (`RD-TS-16`). The queue asks for a sentence before it sends one, the backend refuses a cancellation without one, and the guest's screen renders it beside the order.
- Staff see a new order **within seconds**, attached to the correct table, and are told about it wherever they are: the queue is a live listener, and `notifyStaffOnNewTableOrder` pushes to the owner and to every account associated with the restaurant through the same `sendLocalizedNotification` every other trigger uses - so an installation with notifications switched off stays off (issue \#1184) and everyone is written to in their own language (issue \#1200).
- **The room view stays the primary screen.** Each table on the live floor plan carries a badge counting the orders the kitchen still owes it, and the header links to the queue, so which tables are waiting is answered without leaving the plan and what they are waiting for is one press away.
- Prices from a real order are stronger evidence than a typed price and bypass the suspicious-price warning from issue \#967 during Bite creation. The evidence now exists - `OrderLineSnapshot` records a price the backend checked against the menu - and nothing reads it yet; that is issue \#1073's.

## The Address A Code Already Carries

The scan URL is not this use case's to choose any more. Issue \#1087 prints
stickers, and a sticker glued to a table cannot be corrected, so it fixed the
address at `https://bitetribe.app/t/{token}` - the origin from
`BITE_TRIBE_ORIGIN` in `libs/common/utils`, and a two-character path because
every character in the URL costs QR modules and every module costs printed
millimetres at the distance the code has to be read from.

Issue \#1101 answered it. `/t/:token` is a public route in the consumer shell,
carrying no auth guard and therefore outside `gateAuthenticatedRoutes` - a guest
who never signed up must not be asked to finish an onboarding they never
started. The deep-link handler in `app.component.ts` sends the same address to
the same screen for a guest who has the app installed.

The two constants are now one. `TABLE_SCAN_PATH` in the business app's QR sheet
is built from `PATH.TABLE_SCAN` rather than spelled beside it, because two
constants naming one printed URL can disagree and the disagreement would be
discovered on a sticker already glued to a table.

## The Identity An Order Line Hangs From

Issue \#1099 closed the prerequisite this use case opened with. `MenuItem` and
`Category` in `libs/bite-tribe-common/model/src/lib/menu.ts` each carry an `id`
now, generated once and never reused, and so does every variant. Before that an
item was an array entry addressable only by its name and its position, so
renaming a dish or reordering a category silently repointed anything that had
named it.

Three things in that issue are worth finding again.

**A stored id was not enough.** The business editor matched categories by
`title` and items by `name`, and both `@for` blocks tracked the same strings, so
an id that existed only in Firestore would have satisfied the model change and
still let a rename move the entry an order line points at. The editor keys by id
now, and so do the renderers - which is what the acceptance criteria of that
issue actually assert.

**The id says which item; the snapshot says what it was.** `OrderLineSnapshot`
in `order-line.ts` carries the dish's name, the price charged, the currency and
the variant as they stood at the moment of the order, alongside the id. A line
that read its price through the id would tell a guest they were charged
Tuesday's price for Monday's dinner, because a menu is edited in place. It is
also what makes an order readable after the dish is deleted: the link goes and
the record stays. Every field is `readonly` - a line under construction is a
cart line, and a correction is a staff-side cancellation with a reason, never a
rewrite of what the guest agreed to.

**Availability travels down.** `isMenuVariantAvailable` reads a variant against
the dish it belongs to, because an owner who takes a dish off the menu has said
the dish is off and its sizes are sizes of that dish. Availability does not
travel back up: an available dish with one sold-out size keeps its other sizes.

What the snapshot still has no source for is its currency. A menu carries none -
the consumer menu hardcodes a euro sign and the business editor labels the price
with a dollar sign - so where the value is read from is the cart's question, in
issue \#1103. The field is where that answer has to land.

Menus written before all this are filled in twice over: `backfillMenuItemIds` on
the admin migrations surface walks the collection once, and the client fills in
whatever is still missing on read, so an owner editing an unmigrated menu is
editing by id from the first render and persists the ids on their next save. See
[[UC - Run Operational Migrations]].

## The Session A Confirmation Opens

Confirming the table is what first costs the restaurant anything, and issue
\#1101 is where that cost is bounded.

A **Table Session** is one guest's attachment to a visit - one document per
phone, at `/restaurants/{id}/tableSessions/{sessionId}`, named from the table and
the guest's uid so that re-scanning is idempotent. It is deliberately not the
same record as the visit: a party of four with two phones out is one visit and
two sessions, and a guest who closes their browser must not end the meal. The
model, the five statuses and the storage are on [[Table Visit]].

Three of its properties are this use case's rather than the domain page's.

**A scan is a request, not an occupation.** With no open visit at the table the
session is `pending`, which is live and still cannot order. That is the whole
answer to "a QR code does not prove presence": the restaurant learns somebody is
waiting, and nothing about the table changes until a member of staff seats it.

**Confirming is the seating.** `transitionTableState` activates a table's
pending sessions in the same commit that opens its visit, so a host who sits a
party down has already admitted every guest who scanned while waiting. Nobody is
asked about any of them, because the restaurant has answered the question by
sitting the party down. A pending session that went idle in the meantime is
expired instead of activated - somebody who scanned the sticker at lunch is not
part of the party seated at dinner.

**Joining is by construction.** The second guest to scan reaches the first one's
visit because `TableState.visitId` is the only place to look, and it is written
and dropped by the commit that moves the table's status. The same fact makes
"a guest cannot join a closed visit" true rather than checked: ending the visit
dropped the pointer, so a later scan is a new pending session - which is the
honest description of a party that came back after the table was cleared.

Leaving ends one phone and nothing else. `leaveTableSession` touches neither the
visit, the table, nor anybody else's session, because a guest who could end a
visit by tapping "leave" could clear a table they were never sitting at.

## Reading The Menu Without An Account

Issue \#1102 delivered the half of this use case that needs no table at all.

**A menu is public information, and it is served by a callable.** `loadPublicMenu`
answers with the restaurant and the menu, both assembled field by field, because
a page that renders a restaurant's name needs a document that also carries its
owner, its claim status and its whole ordering configuration. Opening a read
rule wide enough to draw the page would publish all of it; the callable publishes
three fields. It takes a restaurant rather than a token, since the entry point it
exists for is a link a restaurant shares, and such a restaurant may have no floor
plan and no printed codes at all.

**A refusal now means there is nothing to show.** Two members left the refusal
list: a restaurant that has not turned table ordering on, and a kitchen that has
paused it, both resolve and say ordering is shut. A guest who scans either is
offered the menu. `restaurantClosed` stayed a refusal, because it says something
about the restaurant rather than about ordering, and a menu under a "closed"
heading reads as an invitation with nobody there to correct it.

**The menu states its own currency.** `Menu.currency` is set by the owner, and a
menu that states none renders bare numbers - which a reader can ask about, unlike
the hardcoded euro sign the renderer used to print at every restaurant on earth.
The same field is the one `OrderLineSnapshot.currency` has been waiting for.

**Two things are deliberately absent from the public page**: any way to create a
Bite, because the reader may have no account and that button opens a sign-up for
a product they came to read a menu of; and the app's own chrome, because they did
not arrive from anywhere inside it. The renderer itself is the one the
authenticated menu uses, so the two cannot disagree about what an unavailable
dish looks like.

## Building And Sending An Order

Issue \#1103 is where the guest first asks the restaurant for something.

**An order hangs from the visit, not the table.**
`/restaurants/{id}/visits/{visitId}/orders/{orderId}`, which is what lets a party
that is walked to a bigger table keep its starters. `TableOrder.tableId` is
recorded as a plain string beside it, because "which table did this reach the
pass from" is a question the kitchen asks - a record of where the party was
sitting, not the address the order lives at. `submitTableOrder` reads that table
off the **visit** and never off the session, since a session goes on naming the
table its guest scanned.

**One order per phone, one visit per party** (`RD-TS-9`). That is the last
unsettled half of the sharing question, answered at the grain that actually
exists: the party shares a visit and a bill, and each order says which phone sent
it. Per-line attribution was refused because a cart row merges repeated taps, so
un-merging it would give a round of the same beer one line per person.

**The prices the guest saw are the prices recorded, or nothing is recorded**
(`RD-TS-10`). The phone sends what it displayed as a _claim_; the callable checks
each line against the live menu; a difference refuses the whole order and names
the item and both prices. Snapshotting whatever the menu says would silently
recharge a guest whose dish was repriced while they read its description, and
trusting the client's number would let a client name its own price - so neither.
The same shape covers an item that has gone, an item marked off, a variant of a
dish that is off, and a menu whose currency has moved.

**A menu that states no currency cannot be ordered from.** `Menu.currency` is
optional and absent means "not stated" rather than a default, which is right for
a menu somebody is reading and impossible for one somebody is ordering from: a
line has to record what it charged, and the only alternative is guessing a
currency and printing it on a receipt. The ordering screen says so before the
guest builds a cart, and the backend says so again.

**The order moves the table, and writes that move itself** (`RD-TS-11`). A guest
holds no staff authority, so `submitTableOrder` writes the `occupied -> ordering`
transition in its own transaction, from the same types and against the same
matrix the staff callable uses. The audit entry names the guest and carries no
roles, which is the signature of a guest-driven change. A table already
`ordering` is left alone.

**The cart is never stored.** It is a few minutes of somebody changing their
mind, and a write per tap would cost the restaurant for a document nobody reads.
The cost is that a reload loses it, which is the honest trade until issue \#1108
owns offline tolerance and has somewhere to put it.

**A refusal does not take the menu away.** The ordering screen keeps the cart and
the menu on screen and puts the refusal above them, because a guest told their
Margherita sold out needs the row they have to remove and the page they built it
from. The menu is re-read in the same breath, and only the rows the reloaded menu
no longer _offers_ are dropped - a dish still there at a new price stays at the
price the guest agreed to, since agreeing to the new one is theirs to do.

**Sending twice makes two orders.** Idempotency is issue \#1108, and it is
deliberately not half-solved here: a key the client would have to unlearn is
worse than an absence the next issue fills.

## Watching An Order, And Ordering Again

Issue \#1104 is the half of the meal that happens after the tap.

**The screen finds its way back through the session.** A phone holds a token and
nothing else after a reload, and an order id is generated rather than derived -
so the guest's own session document, whose name is built from the table and
their uid, is what the visit id is read off, and the orders are a query under
that visit. Both are snapshot listeners, because what has to arrive within
seconds is a change somebody in the restaurant made.

**A guest sees their own orders** (`RD-TS-12`). `firestore.rules` admits the
`list` only against a query naming the caller's uid, so the permission and the
filter are one thing: drop the constraint and the query is refused whole rather
than widened. The visit-scoped alternative was refused on what a phone can
prove - the session's name carries the table that was **scanned** and a visit
carries the table the party is at **now**, so a party that moved would break the
derivation, and the fix would have been a second copy of the party written onto
the visit by two callables.

**A cancellation is explained, or named** (`RD-TS-13`).
`TableOrder.cancellationReason` is declared by the screen that renders it and
filled by the staff action of issue \#1105; an order cancelled without one still
says so, and points the guest at a member of staff.

**A table that stops taking orders says so before the tap.** The session
listener is what makes "your table has been closed", "you were away too long"
and "staff have not seated this table yet" arrive while the guest is still
reading the menu, and the send button is withdrawn by the same answer. An
**unknown** session is not treated as an ended one: a guest whose listener has
not delivered yet is left to the backend, which revalidates every submission and
refuses it with a reason that is true.

**Silence is never reported as good news.** A snapshot listener that errors is
detached by the SDK rather than retried, so the delivery carries whether the
listener is still alive, and a screen that has stopped updating says so instead
of showing an hour-old `submitted` as though it were current.

**Ordering again re-resolves the token.** The guest taps once and the screen
runs the scan again before offering an "add" button, because a kitchen can
pause while somebody eats a starter. The orders already sent stay on screen
through it.

## The Queue An Order Reaches

Issue \#1105 is the restaurant's half of the loop, and the first surface in
BiteTribe that a kitchen rather than a host works at.

**One collection-group query, scoped by a field** (`RD-TS-14`). Orders hang from
the visit, so tonight's are spread over one subcollection per party and no path
holds them all. The queue asks for them as
`collectionGroup('orders').where('restaurantId', '==', id)` with a second
constraint on the open statuses, rather than opening a listener per seated table
and closing it again on every clearing. The rule that admits it reads
`resource.data.restaurantId`, because a collection-group match has no
`{restaurantId}` in its path - which makes the `where` the permission rather
than a filter, the same mechanism `RD-TS-12` rests on turned towards a
restaurant. It needs a collection-group index exemption that Firestore does not
create on its own, and indexes here deploy by hand.

**Grouped by the table the order was placed from.** A party that moves keeps its
visit and changes its `tableId`, and the kitchen's question is "what goes to
table 12" - so the group is the table on the ticket. A table deleted from the
floor plan since the order was sent still gets a group, named as unknown: losing
an order somebody is waiting for in order to tidy up a number is the wrong
trade.

**Newest first, with the age on every row.** The thing that just arrived is the
thing nobody has looked at; everything already accepted has somebody working on
it. The group carries its **oldest** order's age beside the table number and
marks itself once that passes twelve minutes, so the round that has been sitting
there since before the rush is the loudest thing in its group rather than
something staff have to scroll for. The threshold changes nothing but what the
screen says.

**The row waits for the backend** (`RD-TS-15`), which is the opposite of what
the floor plan does with a table transition - and for a reason that only applies
to a plan. A table that does not change colour while a party stands in front of
the host reads as a tap that missed; a queue row is under the presser's finger,
and an order that appeared to move and then moved back is a kitchen that has
already started cooking. The busy state is per order, so one slow call does not
freeze the pass.

**Two people working one queue get one outcome.** `transitionTableOrderStatus`
applies the move in a transaction against the status the caller says it saw, so
a waiter pressing Served while the kitchen presses Cancelled produces one change
and one sentence naming what the order holds now. That expectation is also what
makes a replay safe, which is why this callable has no idempotency key where the
table transition of issue \#1096 needed one.

**The notification is a trigger, not a send inside the callable.** An order has
to land whatever the push does, and every other notification in this codebase is
shaped the same way. It fires on **create** alone: an order whose status moves is
the restaurant acting on its own decision, and announcing that to the people who
made it would be a notification per press. It collapses per restaurant and
table, so a second round from table 12 replaces the first while table 9 stacks
beside it.

**The alert is a device preference, off by default** (`RD-TS-17`), and the
visual half of it is not behind the same switch - a kitchen loud enough to need
a chime is a kitchen where the chime alone is not enough.

**What the queue does not do.** It never writes Firestore directly, it offers no
move the matrix does not contain, and it has no offline queue: a transition made
with no signal is reported and not written down, because unlike a seating it is
not a fact about the room that somebody is standing in front of.

## Success Criteria

- Scanning a table QR resolves to exactly one restaurant, room, and table, confirmed on screen before any order can be placed. **Met** by issues \#1100 and \#1101.
- Two guests scanning the same table end up in one visit, not two. **Met** by issue \#1101.
- A guest without an account can view the menu and order, if the restaurant allows it. **Met** - the viewing half by issue \#1102 and the ordering half by issue \#1103, both with no account and no install.
- Staff see a new order within seconds, attached to the correct table. **Met** by issue \#1105: a live collection-group listener on the restaurant's open orders, grouped by the table the order was placed from, plus a push to the owner and every associated staff account.
- A staff status change is visible to the guest within seconds. **Met**, both halves: issue \#1104 gave the guest the listener and issue \#1105 gave a status something that changes it. Observed end to end against the emulators - see `Supported Evidence`.
- An order submitted twice because of a flaky network creates one order. **Not met.** Issue \#1103 left it to issue \#1108 rather than half-solving it.
- A revoked or rotated token stops working immediately.
- A Bite created from an order needs only a photo, a rating, and a comment, and carries the verified `restaurantId`.

## Open Product Questions

Tracked in [[Current State - Open Questions]]. Thirteen are settled and recorded as `RD-TS-1` to `RD-TS-17` in [[Recorded Decisions]]: occupancy confirmation, shared sessions, ordering without an account, session expiry, what a scan at a menu-only restaurant does, where a menu's currency lives, and - on 13 September 2026 with issues \#1103, \#1104 and \#1105 - order attribution, price integrity, who moves the table when an order lands, whose orders a guest's screen shows, where the cancellation reason is declared, how the staff queue reads a restaurant's orders, whether a queue row moves ahead of the backend, what a cancellation has to carry, and what a busy-service alert may do without being asked.

The last two of the epic's proposals are now answered rather than open: a cancelled order is corrected by a staff-side cancellation carrying a reason the guest is shown, and staff are notified by an in-app queue plus a push through the existing infrastructure. What remains open is the payment model, which is issue \#1073's.

What is newly open is smaller and belongs to a guest whose party is **moved**: their session goes on naming the table they scanned, and nothing tells them the table number on their screen has changed. Beside it sits a second small one from this issue: an order placed before a party moved stays grouped under the table it was ordered from, which is right for the kitchen and is not what a waiter carrying the plates reads.

## MVP Classification

**[Secondary]** — the whole page. Ordering at the table is stage 3 of issue
\#735 and explicitly post-launch: the initial release ships without a restaurant
taking a single order through BiteTribe, and [[Current State - Open Questions]]
files every question on this page under a post-launch heading.

Nothing here is therefore a release blocker under `UF-15`, including the two
gaps named in `Status`.

## App Store Review Area

**Relevant, and nothing new is claimed yet.** No permission is added: the scan
arrives as a URL, through the camera app or the OS deep-link handler, so the app
declares no camera use for it and the Capacitor plugin set is unchanged. The
route is a public web page in the consumer app and is reachable in the PWA
without a store build.

Two things will need an answer before ordering ships, and neither is this page's
to settle today: an anonymous account is account creation as far as the privacy
nutrition label is concerned, and taking payment at the table is in-app-purchase
territory that the ADR of issue \#1109 has to settle first. See
[[Implementation - Store Declarations]].

## Supported Evidence

Read on 13 September 2026 while implementing issues \#1101, \#1102, \#1103 and
\#1104, on branches `1101-guest-table-session`, `1102-public-table-menu`,
`1103-table-cart-and-order-submission` and
`1104-guest-order-status-and-follow-up-ordering`:

- `apps/bite-tribe-firebase/functions/src/functions/restaurants/` — `resolve-table-qr-token.ts`, `start-table-session.ts`, `leave-table-session.ts`, `transition-table-state.ts`, `table-session.ts`
- `apps/bite-tribe-firebase/firestore.rules` — the `tableSessions` match
- `libs/bite-tribe-common/model/src/lib/table-session.ts` and `table-ordering.ts`
- `libs/bite-tribe/table-session/` — the page and its data-access
- `libs/common/ta-firestore/src/lib/` — `auth.service.ts`, `auth.guard.ts`, `start.guard.ts`
- `apps/bite-tribe-firebase/functions/src/functions/menus/load-public-menu.ts`
- `libs/bite-tribe-common/model/src/lib/public-menu.ts` and `menu.ts`
- `libs/bite-tribe/menu/` — the public page and its data-access
- `libs/bite-tribe-business/restaurant/page/` and `edit-menu/page/` — the switch and the currency control
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/submit-table-order.ts` and `table-order.ts`
- `apps/bite-tribe-firebase/firestore.rules` — the `visits/{visitId}/orders` match
- `libs/bite-tribe-common/model/src/lib/table-order.ts` and `order-line.ts`
- `libs/bite-tribe/table-order/data-access/` — the cart and the submission
- `libs/bite-tribe/menu/page/src/lib/order/` — the ordering screen
- `libs/bite-tribe/api/src/lib/table-session-api/` and `table-order-api/` — the two callables and, since \#1104, the two snapshot listeners
- `libs/bite-tribe/table-order/data-access/src/lib/table-order-history.service.ts` — the chained listeners and what the screen reads off them
- `libs/bite-tribe-business/table-management/data-access/src/lib/table-state-data-access.service.ts` — the listener pattern \#1104 followed

Behaviour was observed as well as read: the flow was driven end to end against
the Firestore, Auth and Functions emulators with a seeded restaurant, through
the running consumer app. For issue \#1103 that run covered scanning, confirming,
building a cart of three dishes with a note, sending it, and reading back the
stored order, the `occupied -> ordering` transition and its audit entry - then
repricing a dish behind the screen's back and watching the next submission be
refused by name, with both prices shown and nothing written.

Issue \#1104 was **not** driven through the running app. Its two claims that a
database can hold - that a guest may list the orders naming them and may not
list the rest - are asserted against the Firestore emulator in
`firestore-rules.emulator-spec.ts`, and the screen is covered by unit specs over
a faked pair of listeners. What was therefore unobserved was the sequence
itself: a real snapshot arriving on a real phone while a status changes
underneath it.

Read again on 13 September 2026 while implementing issue \#1105, on branch
`1105-incoming-order-queue-for-staff`:

- `apps/bite-tribe-firebase/functions/src/functions/restaurants/transition-table-order-status.ts` - the one writer of an order's status
- `apps/bite-tribe-firebase/functions/src/functions/notifications/notify-staff-on-new-table-order.ts` - the trigger, and who it resolves as staff
- `apps/bite-tribe-firebase/firestore.rules` - the `match /{path=**}/orders/{orderId}` collection group
- `apps/bite-tribe-firebase/firestore.indexes.json` - the exemption that query needs
- `libs/bite-tribe-business/table-management/data-access/src/lib/` - `table-order-queue.service.ts`, `table-order-failure.ts`, `order-alert.service.ts`
- `libs/bite-tribe-business/table-management/page/src/lib/` - the queue's component, container, grouping and integration service
- `libs/bite-tribe-business/floor-plan/ui/src/lib/floor-plan-canvas.component.*` - the order badge on a table

Its claims are covered three ways. The rules half - that the owner, the staff of
that restaurant and an operator may run the collection-group query, that a query
naming no restaurant is refused whole, and that a business account holding
another restaurant is refused - is asserted against the Firestore emulator in
`firestore-rules.emulator-spec.ts`. The callable half - the matrix, the race, the
cancellation reason, who may work the pass, and that nothing but the four status
fields moves - is asserted against the emulator in
`table-order-queue.emulator-spec.ts`. The screens are covered by unit specs and
by ten Loki references under `Business/Order Queue`.

**Behaviour was observed as well as read**, which closes the observation issue
\#1104 left to this one. The business app was driven against the Firestore, Auth
and Functions emulators as the seeded `staff@test.com`, on a restaurant with a
published room, two tables, a menu in euros, an open visit and two orders on it.
Signing in landed on the live room, where table 12 drew its `ordering` status,
a badge reading `2`, an accessible name ending "2 open order(s)", and a header
counting the restaurant's open orders. The queue at
`restaurant/{id}/orders` drew the table's group with both tickets, the variant,
the guest's note and the age on each row, marked red past the threshold.
Pressing Accept moved the row to `Accepted` and the stored order to
`status: accepted` with `statusChangedByUserId` naming the staff account and the
lines, the total and `submittedAt` untouched. Cancelling opened a dialog whose
send button was disabled until a sentence was typed, and the stored order then
carried `cancelled` and the sentence, where the guest's screen of \#1104 reads
it. Writing a third order behind the screen's back put it at the top of the
queue within seconds, raised the count and fired the arrival flash, and
`notifyStaffOnNewTableOrder` ran in the Functions emulator and resolved two
recipients - the owner and the staff account.

One defect was found that way and fixed: the cancellation dialog's reason field
drew no border at all. `fill="outline"` is a Material-mode feature and this app
runs in iOS mode, so the field read as empty space under its label - on the one
screen whose whole point is that somebody types a sentence. It carries
`mode="md"` now, the pair the Bite trail form already used.

What is still unobserved is delivery of the push itself. The emulator has no
registered installation to deliver to, and the business app runs in a browser
where `@capacitor/push-notifications` registers no token at all - so in
production the trigger reaches a member of staff only on an installation of the
consumer app signed into the same account. The queue's own listener and its
per-device alert are what a tablet at the pass actually hears. See
[[Current State - Open Questions]].

## Related GitHub Scope

- Issue \#1072 - QR table menu and table ordering, with ten child issues
- Issue \#1099 - stable menu item identifiers, availability and price snapshots, the model this use case hangs its order lines from
- Issue \#1100 - resolve and validate a table QR token, the backend every later child calls before it does anything
- Issue \#1101 - guest table session start and join, which gave the printed address a screen and the guest an identity to hold a session with
- Issue \#1102 - public table menu browsing without an account, which gave the flag a writer and the menu a page of its own
- Issue \#1103 - table cart and order submission, which gave the guest something to do with the menu and the restaurant something to cook
- Issue \#1104 - guest order status and follow-up ordering, which gave the guest the live list of what they sent, the sentence a cancellation is explained with, and a second order into the same visit
- Issue \#1105 - incoming order queue for staff, which gave the restaurant the screen that answers a guest: the queue, every order status after `submitted`, the badge on the floor plan and the push that reaches the people on shift
- Issue \#1108 - offline-tolerant and idempotent order submission, which owns the duplicate an order submitted twice still creates
- Issue \#1598 - orderable menu extras, split out of \#1103 because `Category.extrasBlock` has no ids, no renderer and no editor
- Issue \#1107 - QR token abuse protection, which owns the durable rate limit the resolution only approximates
- Issue \#1087 - printable table QR sheets, which fixed the scan URL this use case has to serve
- Issue \#1073 - Table payment and Bite creation from orders, with six child issues
- Issue \#345 - Kavi wants to offer a QR code at the table to order digitally
- Issue \#371 - business wants the menu accessible via QR code
- Issue \#370 - user wants to access the menu without authentication
- Issue \#344 - orderable bites, JustEat-like, a different fulfilment model and out of scope

## Related Domains

- [[Table Visit]]
- [[Table]]
- [[Restaurant]]
- [[Bite]]

## Related Pages

- [[Recorded Decisions]] - `RD-TS-1` to `RD-TS-17` bind this page
- [[Architecture - Auth]] - the anonymous guest
- [[Architecture - Firebase]] - the rules on `tableSessions`, and the collection-group rule and index the staff queue reads through
- [[Implementation - Firebase Functions]] - the callables
- [[Current State - Open Questions]]
