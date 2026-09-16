# UC - Order At The Table Through A QR Code

## Status

**Level:** L1

Partly implemented. Specified through issue \#1072 as stage 3 of issue \#735, and issue \#1073 as stage 4.

Every one of the ten children has landed. Issue \#1099 gave menu items the identity
an order line hangs from; issue \#1100 made a scanned token resolve, validating
the six rules below and answering with a restaurant, a room, a table and a menu
or one of twelve distinct refusal reasons; issue \#1101 gave the guest a
screen, a session and an identity to hold it with; issue \#1103 gave them a
cart and a way to send it; issue \#1104 gave them a way to watch what happens
to it and to order again; issue \#1105 gave the restaurant the screen that
answers them; issue \#1106 gave the guest a way to ask for a person without
waving; issue \#1107 assumed the code is already public and made that boring;
and issue \#1108 assumed the wifi drops things and made that survivable.

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

**Issue \#1106 closed the part that is not about food at all.** A guest with an
active session taps once for a waiter or once for the bill; a marker appears on
the room view within seconds and a row appears above the tickets in the queue;
a member of staff presses **On my way** and it goes from every device. A bill
request moves the table to `awaitingPayment` in the same commit, which is also
what stops it taking further orders. The signal lives at
`/restaurants/{id}/assistanceRequests/{n}_{tableId}_{kind}` - a **derived**
name, which is what makes a repeated tap join the signal that is up rather than
raise a second one, bounds the collection at two documents per table so the
staff screens read it whole with no index, and lets the guest's phone subscribe
to the answer. Six decisions shaped it, `RD-TS-18` to `RD-TS-23`.

**Issue \#1107 closed the last gap this page carried, and it was two gaps at
once.** Staff can now see a **pending session** - the guest who scanned while
waiting to be seated, which issue \#1101 had been writing since it landed and
nothing drew - and a restaurant can replace the code of one table or of a whole
room in one action, which is the answer to a code that has been photographed and
posted. Resolution is throttled across function instances rather than within
one, and what is throttled is reported to the restaurant as a row it can act on.
Five decisions shaped it, `RD-TS-24` to `RD-TS-28`.

**Issue \#1108 closed the epic, on the one criterion that had stayed open since
\#1103.** A submission carries a key the phone mints once per tap and reuses on
every attempt; the backend names the order document after it, so a retry is
answered with the order the first attempt wrote rather than writing a second
one. Around that sit the three things that make a retry worth having: a cart
kept on the phone and rebuilt from the live menu, so a dropped tab does not cost
the guest the round they chose; three attempts with a growing gap, behind a send
button that cannot be double-triggered; and, when none of them resolves, a
sentence that says which of the two things happened - the order never left the
phone, or it left and nothing came back - with a retry that is a question rather
than a second dinner. Six decisions shaped it, `RD-TS-29` to `RD-TS-34`.

Table ordering is off for every restaurant until an owner turns it on, and what
still has to happen before one should is the deploy: the rules and the indexes
are applied by hand, so a queue opened against production today would be refused
until `npx nx firebase-deploy-rules bite-tribe-firebase` and
`npx nx firebase-deploy-indexes bite-tribe-firebase` have run. Issue \#1107 adds
a third manual step with no Nx target at all - a TTL policy on
`scanRateLimits.expiresAt` - without which the durable counters are written and
never removed.

## Goal

A guest at a table scans a BiteTribe QR code, sees the right menu for the right table, places an order, pays, and can turn the dishes they actually ordered into Bites.

## Actors

- Restaurant guest, with or without a BiteTribe account
- Restaurant staff handling incoming orders
- BiteTribe user creating a Bite afterwards

## Flow

- The guest scans the QR code on the table. Implemented, issue \#1101.
- The backend resolves the opaque token to a restaurant, room, table, and menu. Implemented, issue \#1100.
- The guest confirms an unambiguous context screen: "You are ordering at Sakura Kitchen, table 12". Implemented, issue \#1101.
- The guest joins the table's open visit, or raises a pending signal that staff confirm. Implemented, issue \#1101.
- The guest browses the menu, with unavailable items marked and not addable, a variant of an unavailable dish included. Implemented, issues \#1102 and \#1103.
- The guest builds a cart and submits an order. Implemented, issue \#1103.
- Staff see the order in a queue attached to the correct table, accept it, and update its status. Implemented, issue \#1105.
- The guest watches each order move along its status, and is told when one is cancelled and why. Implemented, issues \#1104 and \#1105.
- The guest orders again into the same visit without rescanning. Implemented, issue \#1104.
- The guest requests assistance or the bill. Implemented, issue \#1106.
- The guest pays in the app or asks staff to settle, and the visit closes. Not built; issue \#1073, stage 4.
- The guest sees a receipt listing the dishes they ordered. Not built; issue \#1073, stage 4.
- The guest selects a dish and creates a Bite prefilled with restaurant, dish, price, and currency, adding only a photo, rating, and comment. Not built; issue \#1073, stage 4. `OrderLineSnapshot` already records the checked price this would read.

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
- Submission carries an idempotency key, so a double tap on a flaky restaurant network produces one order. Delivered by issue \#1108 and recorded as `RD-TS-29`: the key **names the order document**, at `visits/{visitId}/orders/req-{requestId}`, which turns deduplication into a read of one document rather than a search for an order that looks similar - and, because that read is inside the transaction, two copies of one request racing each other contend on it.
- **A replay is answered before the meal it happened in is looked at** (`RD-TS-30`). The stored order is returned before the session status, the visit, the table and the lines are checked, because a replay arrives after the world has moved on and none of that makes the order that already landed untrue. The answer says `replayed`, so a guest who tapped once is not told twice that they have ordered.
- **The phone never invents a certainty or a doubt** (`RD-TS-31`). A submission it could not resolve says the order never left the device when no attempt was made, and says it cannot tell when one went out and came back with nothing. Both offer the same retry, because the key makes it safe either way.
- **You cannot change an order you might already have placed** (`RD-TS-32`). While a submission is unresolved the menu and the cart stay on screen and the cart stops accepting edits, because the key already names an order that does not contain whatever would be added to it.
- **The cart survives a reload and is rebuilt from the live menu** (`RD-TS-33`). It still never reaches Firestore - the restaurant pays nothing for a guest changing their mind - and it is kept on the phone as **ids**, so a restored row cannot carry a dish that has been taken off, marked unavailable or left unpriced, and a repriced dish comes back at the price on the screen the guest is looking at.
- A guest sees the orders **their own phone** sent, and not the party's (`RD-TS-12`). The bill is shared and is settled at the table; what the screen runs a total over is what this guest ordered, with cancelled orders excluded from it.
- An order's status is the **restaurant's** to move, and only along the matrix. `transitionTableOrderStatus` is the only writer of it, `firestore.rules` refuses every client write to the collection, and the transition matrix lives once in `libs/bite-tribe-common/model` with a checked copy in the Functions project - so the buttons the queue offers and the moves the backend accepts cannot disagree.
- An order is **immutable except for its status**. A correction is a cancellation with a reason, never a rewrite of the lines: a bill that can be edited after the fact is a bill nobody can dispute. The staff callable updates four fields and touches nothing the guest agreed to.
- **Cancellations are explained, not silent** (`RD-TS-16`). The queue asks for a sentence before it sends one, the backend refuses a cancellation without one, and the guest's screen renders it beside the order.
- Staff see a new order **within seconds**, attached to the correct table, and are told about it wherever they are: the queue is a live listener, and `notifyStaffOnNewTableOrder` pushes to the owner and to every account associated with the restaurant through the same `sendLocalizedNotification` every other trigger uses - so an installation with notifications switched off stays off (issue \#1184) and everyone is written to in their own language (issue \#1200).
- **The room view stays the primary screen.** Each table on the live floor plan carries a badge counting the orders the kitchen still owes it, and the header links to the queue, so which tables are waiting is answered without leaving the plan and what they are waiting for is one press away.
- **A call for a waiter is a table signal, not a message** (`RD-TS-18`). Two kinds, `callStaff` and `requestBill`, one document per table per kind at a name derived from both - so a repeated tap addresses the signal that is already up, across every phone at the table, and two guests asking for the bill are one bill. The collection is bounded by the room at two documents per table, which is why the room view and the queue read it whole with no query, no index and no collection-group rule.
- **A signal hangs from the table and an order hangs from the visit** (`RD-TS-19`). An order is money and belongs to the party, so a party that moves keeps it; a signal means _come to this table_, so a party that moves leaves it behind. Both are written against the **visit's** `tableId` rather than the scanned one, because that is where the party is sitting now.
- **Asking for the bill moves the table and acknowledging moves nothing** (`RD-TS-21`). `requestBill` writes `awaitingPayment` in the commit that raises the signal, which is also what stops the table taking further orders; `awaitingPayment` is still a status a signal may be raised _from_, because a party whose waiter has not come asks again.
- **The rate limit is the document name plus one clock** (`RD-TS-20`). A minute, measured from when a signal was raised rather than from when it was answered, so a restaurant is not punished for being quick; joining a signal that is still open is not rate limited at all.
- **An acknowledgement is one destination, so a second press is not a conflict** (`RD-TS-22`). No `expectedStatus`, no dialog, and no reason to type: a cancellation takes something away from a guest and owes them a sentence, and this gives them one.
- **The two staff lists sort in opposite directions** (`RD-TS-23`). The tickets newest first, because the one that just landed is the one nobody has read; the tables that are calling oldest first, because the guest who has been waving longest is the one nobody has walked to. A repeated tap moves `lastRequestedAt` and not `requestedAt`, so tapping cannot push a table up the list - the row says "asked again" instead.
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

**The cart never reaches Firestore.** It is a few minutes of somebody changing
their mind, and a write per tap would cost the restaurant for a document nobody
reads. It costs a reload for the length of this issue; issue \#1108 gave it the
phone's own storage, which costs the restaurant nothing (`RD-TS-33`).

**A refusal does not take the menu away.** The ordering screen keeps the cart and
the menu on screen and puts the refusal above them, because a guest told their
Margherita sold out needs the row they have to remove and the page they built it
from. The menu is re-read in the same breath, and only the rows the reloaded menu
no longer _offers_ are dropped - a dish still there at a new price stays at the
price the guest agreed to, since agreeing to the new one is theirs to do.

**Sending twice makes two orders.** Idempotency was left whole to issue \#1108
rather than half-solved here, on the grounds that a key the client would have to
unlearn is worse than an absence the next issue fills. That issue filled it - see
`An Order That May Or May Not Have Arrived` below.

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

## The Two Things A Guest Still Needs A Person For

Issue \#1106 is the part of the table that is not about food. A guest taps once
for a waiter or once for the bill, and a member of staff walks over.

**The name is the rate limit** (`RD-TS-18`). The document is
`/restaurants/{id}/assistanceRequests/{n}_{tableId}_{kind}`, derived exactly as
`tableSessionId` names one guest at one table, and a repeated tap therefore
addresses the first tap's document rather than writing a second one. That holds
across phones as well as across taps - two guests at one table asking for the
bill are one bill - and it is why the acceptance criterion is satisfied by the
address rather than by a check a later caller could forget.

Two more things follow from the same name, and each of them is a thing not
built. The collection is **bounded by the room** at two documents per table, so
the room view and the queue read it whole with no `where`, no composite index
and no collection-group match - the machinery `RD-TS-14` needed for orders, not
needed here. And the guest's phone can **derive the name and subscribe**, which
is what makes "received, then acknowledged" a listener rather than a poll: the
acknowledgement happens on somebody else's device, minutes later, and arrives
without the guest touching anything.

What the name costs is history: a new request of the same kind at the same table
replaces the answered one. That is the right trade for a signal, and the one
durable consequence a request has - the table moving to `awaitingPayment` - is
recorded in `tableStateTransitions`, which nothing overwrites.

**It checks the party and not the kitchen.** An active session, an open visit,
and a table the floor agrees somebody is sitting at. It deliberately does _not_
check `orderingAvailability`: a kitchen that has closed, paused or never took
orders at the table has nothing to do with whether somebody in the dining room
may ask for the bill, and the moment they most need to is after the kitchen
shuts. A guest whose table staff have not seated yet holds a `pending` session
and is refused here, because making that visible to the floor is issue \#1107's
and two rows for one person waiting at the door is worse than one.

**The bill closes the ordering** (`RD-TS-21`). `requestBill` writes
`awaitingPayment` in the same commit, from the same types and against the same
matrix `submitTableOrder` uses, and `ORDERABLE_TABLE_STATUSES` excludes it - so
a dish added after the bill was asked for is a conversation with a member of
staff rather than a tap. The same status is still one a signal may be raised
_from_, which is the one place the two lists disagree and is deliberate: the
second request is the one a guest makes because nobody came.

**On the floor it is one mark and two lists.** The plan draws a pulsing disc on
the table's opposite top corner from the order badge - movement, because on a
drawing already carrying a status colour, a status glyph, a number, a duration
and an order badge, a sixth static mark is a sixth thing to notice rather than
something unmistakable. What it is asking for is a sentence, which is not
readable at the size a 900 mm table gives it at zoom-to-fit, so the mark says
_this table is waiting_ and the queue one press away says what for - the same
split the order badge makes between a count and the ticket behind it. The
sentence is in the tooltip and the accessible name, read by people the size
constraint was never about.

**Answering it is one press** (`RD-TS-22`). No confirmation, no reason to type,
and no expectation to send: an acknowledgement has one destination, so two
people pressing it in the same second both wanted what happened, and the second
press is answered with the stored values rather than with an error about a race
that cost nobody anything.

**What this does not do.** It does not take payment or close the visit, which is
issue \#1073's. It does not reach a guest who has not been seated, which is
issue \#1107's. It sends **no push**, unlike a new order: a raised hand is
answered by somebody who is in the room, and the queue's own listener and its
per-device alert are what a tablet at the pass hears - a notification to a phone
in a pocket would be a second channel for the same fact with none of the
urgency. And the selected-table panel beside the plan does not name the call; the
mark on the table and the row in the queue do.

It changes nothing in production until
`npx nx firebase-deploy-rules bite-tribe-firebase` has run, because the rule
that admits the two reads is deployed by hand. No index deploy is needed, which
is the point of the derived name.

## What A Code On The Internet Costs

Issue \#1107 is the part of this use case that assumes the sticker has already
been photographed, shared and posted, and makes that boring. Nothing in it
depends on the token staying secret, which is the acceptance criterion it was
written against.

**The limit is two counters, cheapest first** (`RD-TS-24`). The in-memory
counter issue \#1100 shipped with its own limits written on it - it stops a loop
against a warm instance and not a distributed one - stays in front of a durable
counter in `/scanRateLimits/{dimension}_{bucket}_{windowStartedAt}`, because a
flood against one instance is absorbed for free after the thirtieth request and
only traffic spread thinly enough to look ordinary reaches Firestore at all. The
durable limits are correspondingly higher: they count the aggregate across
however many instances are running. A third dimension, the IP, is added because
`clientOf` answers the uid **or** the address, so an attacker holding one
throwaway anonymous account per request was bucketed by neither. What that
dimension is worth is stated rather than assumed - `X-Forwarded-For` reaches
`req.ip`, so it raises the cost and is not a boundary - and the address is
hashed, because an IP appears in no other document in this product.

**What is throttled is also visible** (`RD-TS-25`). A scan that does not look
ordinary raises a row at
`/restaurants/{id}/scanAnomalies/{n}_{tableId}_{kind}` - `RD-TS-18`'s address,
for `RD-TS-18`'s reasons: one document per table per kind, a repeat joins the
row that is up, and the staff screen reads the whole collection with no query,
no index and no collection-group rule. The log this replaces would have grown
**with the attack**, which is a denial of service wearing the costume of a
security feature. Five kinds: a token past its limit, a code scanned while the
restaurant is shut, a code scanned at a table out of service, more live sessions
on one table than it can seat, and a consented position far from the restaurant.
The first three say that replacing the code ends it; the other two report a
figure and suggest nothing, because eight phones at a four-top is usually eight
phones at a four-top.

The writer is bounded twice, and has to be, because the one thing an attacker
fully controls is how often they call: only the request that takes a bucket past
its limit raises a row, and a row raised inside `SCAN_ANOMALY_QUIET_MS` is not
written again. So `ScanAnomaly.count` counts **raisings and not requests** - the
row says so, and forty thousand resolutions inside a minute are one.

**The answer to a row is one action, and it now exists.**
`rotateTableQrToken` had existed since issue \#1086 with no caller anywhere in
the workspace, so "a leaked code can be invalidated in one action" was satisfied
by no surface at all. The QR sheet now replaces the codes of the tables an owner
has ticked - one table for a code on somebody's feed, the room filter plus
Select all for a sheet that left the building - and `rotateTableQrTokens` is the
bulk half. It refuses a call naming neither a room nor a set of tables, because
"rotate every code in the building" must not be what a caller gets by leaving an
argument out (`RD-TS-28`). The old token is superseded rather than deleted, so a
guest at the sticker still on the table is told to look at it again.

**The pending session is finally drawn** (`RD-TS-26`), which closes the gap this
page carried from issue \#1101 onward. It is its own list above the tables that
are calling, in the warning tone rather than the danger one, one row per
**table** rather than per phone - three friends who each scan the code at the
door are one party. It is deliberately not an anomaly: a guest waiting to be
seated is the flow working, and putting them among the rows about codes being
hammered would make the ordinary case look like an incident.

**The coarse location is a signal and never a gate** (`RD-TS-27`). A guest may
tick a box on the confirmation screen; one who does not, whose device has no fix
or whose app has no location grant starts the same session, reads the same menu
and places the same order. It never prompts - the OS prompt belongs to
onboarding - and the coordinates are compared to the restaurant's and discarded,
leaving a rounded distance on the rows far enough away to be worth one.

**The residual risk, stated rather than implied.** A QR code identifies a table
context and never proves physical presence. Nothing here changes that, and
nothing here tries to: `RD-TS-1` is what bounds it - a scan at a table nobody has
seated writes one row and cannot order - and everything above raises the cost of
working through a code that is already public. A restaurant that wants presence
proved has to prove it with a person.

It changes nothing in production until
`npx nx firebase-deploy-rules bite-tribe-firebase` and
`npx nx firebase-deploy-indexes bite-tribe-firebase` have run, and one more
thing is applied by hand with no Nx target at all: a TTL policy on
`scanRateLimits.expiresAt`. Until that policy exists the counters are never
removed - a document per bucket per minute, which is a handful an hour for an
ordinary restaurant and three a minute under attack.

## An Order That May Or May Not Have Arrived

Issue \#1108 is the last child of the epic, and it is about the one sentence
nobody wants to read at a table: we are not sure whether that went through.

**A restaurant's wifi drops answers as readily as it drops requests.** That is
the whole problem, stated once. A submission that timed out is, from the phone,
indistinguishable from one that never arrived - and the honest response to both
is to send it again. Unlabelled, that second send is a second dinner.

**So the phone labels it** (`RD-TS-29`). A key is minted once per _intent_ - one
cart, one tap - and every attempt carries it, including attempts made after the
phone was locked, reloaded or carried out of range and back. The key **names the
order document**: `submitTableOrder` writes to
`visits/{visitId}/orders/req-{requestId}`, so a replay reads the id it would
write rather than searching for an order that looks similar, and two copies of
one request racing each other contend on that one document because the read is
inside the transaction. The prefix and the eight-to-128-character pattern are
issue \#1096's, unchanged, for the two reasons that issue gives: the key has to
be a legal Firestore document name, and it has to be one no auto-generated id
could ever be. What is new is that the derivation lives in the **model** as well
as in the backend, because the guest's phone uses it too - an order it sent is
findable by address in the list it is already listening to.

**The replay is answered before the meal it happened in is looked at**
(`RD-TS-30`). The order document is read straight after the session and an
existing one is returned before the session status, the visit, the table and
every line are checked. A replay arrives after the world has moved on: the
kitchen may have paused, the party may have been moved, staff may have closed
the table. None of that makes the order that already landed untrue, and the one
thing it must not do is land twice. The answer carries `replayed`, so the screen
says "this was already with the kitchen" rather than confirming an order twice
to somebody who placed it once.

**Three attempts, then a sentence.** The phone retries on a transport failure
with a growing gap, and stops - a fourth attempt would arrive after the point
where somebody decides the app is broken and waves at a waiter instead. What
follows is not an apology but a distinction (`RD-TS-31`): the order _never left
the phone_, when no attempt was made because the device had no connection, or we
_cannot tell_, when a call went out and nothing came back. Inventing a doubt
where there is none teaches a guest to order twice to be sure; inventing a
certainty where there is a doubt means the dish turns up anyway. Both are
offered the same way out, because the key makes the retry safe either way.

**While it is unresolved the cart freezes** (`RD-TS-32`). The menu and the cart
stay on screen, for the reason a refusal leaves them there and one stronger: the
guest has to see what they sent. What goes is the editing. The order that key
names may already be with the kitchen, and a cart that accepted an edit would
build a round that can never be sent - the key would answer with the order that
does not contain it. You cannot change an order you might already have placed,
and the way out is one tap that either confirms it or releases the cart.

**The cart is kept on the phone** (`RD-TS-33`). Issue \#1103's rule survives
intact: nothing reaches Firestore, and the restaurant pays nothing for a guest
changing their mind. What it gains is device storage, keyed by restaurant and
table rather than by the guest's account - a phone is one guest, and an
anonymous uid the app re-minted is not something a guest chose or could be asked
about. What is stored is **ids**, never dishes. A row is rebuilt from the menu on
screen now, so a restored cart cannot carry a dish that has been taken off,
marked unavailable or left unpriced, and a repriced dish comes back at the price
the guest can see. Storing the item itself would be keeping a second, stale menu
on the phone and then ordering from the copy, which is the price-integrity
problem of `RD-TS-10` with the stale data one layer further away.

**A record found after a reload is resolved without being asked** (`RD-TS-34`).
Sending it again _is_ the question: one request either reconciles the phone with
the truth or places the order nobody ever answered. What bounds it is the
record's age - one older than a meal is dropped rather than sent, because the
restaurant's own session idle timeout has closed the table by then and an order
arriving in a dining room the guest left hours ago is worse than a record nobody
is watching for.

**What this issue did not build is a queue.** The staff transition queue of
issue \#1096 is the nearest thing in the workspace and was deliberately not
copied: that one replays entry after entry because a host acts on table after
table while the signal is gone, and each entry expects the one before it to have
landed. A guest has one cart and one order in flight, so a queue here would be a
list that never holds two things, with an ordering rule and a drop policy no
path could reach. What is shared is the shape of the answer and the argument for
writing an intent down at all.

## Success Criteria

- Scanning a table QR resolves to exactly one restaurant, room, and table, confirmed on screen before any order can be placed. **Met** by issues \#1100 and \#1101.
- Two guests scanning the same table end up in one visit, not two. **Met** by issue \#1101.
- A guest without an account can view the menu and order, if the restaurant allows it. **Met** - the viewing half by issue \#1102 and the ordering half by issue \#1103, both with no account and no install.
- Staff see a new order within seconds, attached to the correct table. **Met** by issue \#1105: a live collection-group listener on the restaurant's open orders, grouped by the table the order was placed from, plus a push to the owner and every associated staff account.
- A staff status change is visible to the guest within seconds. **Met**, both halves: issue \#1104 gave the guest the listener and issue \#1105 gave a status something that changes it. Observed end to end against the emulators - see `Supported Evidence`.
- A guest can ask for a waiter or for the bill, and the request is unmistakable on the room view within seconds. **Met** by issue \#1106: a pulsing mark on the table's corner on the live plan, a row above the tickets in the queue, and a second count on the header link. Acknowledging clears it on every device, because every device is reading one document.
- Repeated taps do not create repeated signals. **Met** by issue \#1106, and by the address rather than by a check: the document is named after the table and the kind, so the second tap lands on the first tap's document - across phones as well as across taps.
- An order submitted twice because of a flaky network creates one order. **Met** by issue \#1108, and by the address rather than by a check: the order document is named after the key the phone minted, so the second submission reads the first one's document instead of writing a second. Observed end to end against the emulators with the answer to every attempt dropped on the wire - see `Supported Evidence`.
- A guest is never left unsure whether their order was placed. **Met** by issue \#1108: three attempts, then a sentence that says whether the order left the phone at all, and a retry that is a question rather than a second order.
- A lost connection mid-submission is recoverable without rebuilding the cart. **Met** by issue \#1108: the cart is kept on the phone and rebuilt from the live menu, and the submission it was sent as is kept beside it.
- A revoked or rotated token stops working immediately. **Met** by issues \#1086 and \#1107: the backend has superseded a rotated token since \#1086 and `resolveTableQrToken` answers `tokenSuperseded` with "look at the table again"; \#1107 gave a restaurant the surface that does it, for one table or for a whole room.
- Automated resolution attempts are throttled across instances and leave a record the restaurant can read. **Met** by issue \#1107.
- A guest who declines to share their location scans, sits down and orders exactly as one who allows it. **Met** by issue \#1107.
- A Bite created from an order needs only a photo, a rating, and a comment, and carries the verified `restaurantId`.

## Open Product Questions

Tracked in [[Current State - Open Questions]]. Thirty are settled and recorded as `RD-TS-1` to `RD-TS-34` in [[Recorded Decisions]]: occupancy confirmation, shared sessions, ordering without an account, session expiry, what a scan at a menu-only restaurant does, where a menu's currency lives, and - on 13 September 2026 with issues \#1103, \#1104 and \#1105 - order attribution, price integrity, who moves the table when an order lands, whose orders a guest's screen shows, where the cancellation reason is declared, how the staff queue reads a restaurant's orders, whether a queue row moves ahead of the backend, what a cancellation has to carry, what a busy-service alert may do without being asked, and - with issue \#1106 - how a call for a waiter is addressed, what it hangs from, how it is rate limited, what asking for the bill does to the table, why an acknowledgement needs no expectation, and why the two staff lists sort in opposite directions; and - with issue \#1107 - how a scan endpoint is limited across instances, what a restaurant is told about scans that do not look ordinary, where a pending session is drawn, what a shared position may and may not do, and which authority replaces a printed code; and - with issue \#1108 - how a submission is identified across attempts, when a replay is answered, what the phone may claim about an order it could not confirm, what an unresolved submission does to the cart, where the cart lives between reloads, and how long an unsent order stays worth sending.

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

Read again on 13 September 2026 while implementing issue \#1106, on branch
`1105-incoming-order-queue-for-staff`:

- `libs/bite-tribe-common/model/src/lib/table-assistance.ts` and its checked copy in the Functions project
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/request-table-assistance.ts` - the guest's callable, the dedupe, the cooldown and the table move
- `apps/bite-tribe-firebase/functions/src/functions/restaurants/acknowledge-table-assistance.ts` - the one writer of a signal's status
- `apps/bite-tribe-firebase/firestore.rules` - the `assistanceRequests` match, and the `resource == null` clause that lets a phone watch a signal it has not raised
- `libs/bite-tribe/api/src/lib/table-assistance-api/` and `libs/bite-tribe/table-order/data-access/src/lib/table-assistance.service.ts` - the call out and the two listeners back
- `libs/bite-tribe-business/table-management/` - the plain collection listener, the rows, the acknowledgement and the two badges
- `libs/bite-tribe-business/floor-plan/ui/src/lib/floor-plan-canvas.component.*` - the pulsing mark on a calling table

Its claims are covered three ways. The rules half - that a guest reads the
signal they are named on and not one raised at another table, that a missing
document is readable so a listener attaching before anything is asked does not
detach, that no `list` is admitted to a guest, and that nobody may write - is
asserted against the Firestore emulator in `firestore-rules.emulator-spec.ts`.
The callable half - that a repeated tap joins rather than raises, that the age
does not reset when it does, that the cooldown refuses and names when, that a
bill request moves the table and a waiter call does not, that a table awaiting
payment may still call, that a `pending` session is refused, that a paused
kitchen is not, and that a second acknowledgement answers with what the first
one wrote - is asserted in `table-assistance.emulator-spec.ts`. The screens are
covered by unit specs and by four new Loki references under
`Business/Order Queue`, plus the fourteen `Business/Table Plan` references the
mark and the second header badge changed.

**It was not driven through the running app.** What is therefore unobserved is
the sequence itself: a guest tapping on a phone while a member of staff watches
the mark appear on a plan and clears it. The rules and the callable are
asserted against the real database and the screens against faked listeners, so
what is untested is the wiring between them.

Run on 14 September 2026 while implementing issue \#1108, on branch
`1108-offline-tolerant-and-idempotent-order-submission`:

**The guest's half was driven through the running app, over a broken wire.**
`apps/bite-tribe-e2e/src/tests/table-order-flaky-network.spec.ts` seeds a
restaurant, a menu, a table, a token and the seating a host would have done,
then scans the code, sits down, builds a cart and sends it in a real browser
against the real emulators - with every submission forwarded to the callable and
its answer dropped on the way back, which is the shape of a restaurant's wifi
losing a response rather than a request. The phone retried, gave up saying so,
and the guest's own retry was answered with the order the first attempt had
written: one order under the visit, read back out of Firestore, and the
confirmation naming it as one the kitchen already had. A second test reloads the
page mid-cart and finds the dish still in it.

What that leaves unobserved is the same gap the rest of this page has: the
_staff_ side of one of these journeys, with a queue on a second screen while the
guest's phone is retrying.

## Related GitHub Scope

- Issue \#1072 - QR table menu and table ordering, with ten child issues
- Issue \#1099 - stable menu item identifiers, availability and price snapshots, the model this use case hangs its order lines from
- Issue \#1100 - resolve and validate a table QR token, the backend every later child calls before it does anything
- Issue \#1101 - guest table session start and join, which gave the printed address a screen and the guest an identity to hold a session with
- Issue \#1102 - public table menu browsing without an account, which gave the flag a writer and the menu a page of its own
- Issue \#1103 - table cart and order submission, which gave the guest something to do with the menu and the restaurant something to cook
- Issue \#1104 - guest order status and follow-up ordering, which gave the guest the live list of what they sent, the sentence a cancellation is explained with, and a second order into the same visit
- Issue \#1105 - incoming order queue for staff, which gave the restaurant the screen that answers a guest: the queue, every order status after `submitted`, the badge on the floor plan and the push that reaches the people on shift
- Issue \#1106 - request staff assistance and request the bill, which gave the guest a way to ask for a person without waving and the floor a way to see it and clear it
- Issue \#1108 - offline-tolerant and idempotent order submission, which closed the epic: the key that makes a retry one order, the cart that survives a reload, and the sentence a guest gets when the phone cannot tell what happened
- Issue \#1598 - orderable menu extras, split out of \#1103 because `Category.extrasBlock` has no ids, no renderer and no editor
- Issue \#1107 - QR token abuse protection, which made the resolution limit durable, gave the restaurant the rows and the rotation that answer a public code, and drew the pending session the epic had been writing since \#1101
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

- [[Recorded Decisions]] - `RD-TS-1` to `RD-TS-34` bind this page
- [[Architecture - Auth]] - the anonymous guest
- [[Architecture - Firebase]] - the rules on `tableSessions`, and the collection-group rule and index the staff queue reads through
- [[Implementation - Firebase Functions]] - the callables
- [[Current State - Open Questions]]
