# UC - Order At The Table Through A QR Code

## Status

Not implemented. Specified through issue \#1072 as stage 3 of issue \#735, and issue \#1073 as stage 4.

Blocked by stages 0, 1, and 2.

## Goal

A guest at a table scans a BiteTribe QR code, sees the right menu for the right table, places an order, pays, and can turn the dishes they actually ordered into Bites.

## Actors

- Restaurant guest, with or without a BiteTribe account
- Restaurant staff handling incoming orders
- BiteTribe user creating a Bite afterwards

## Planned Flow

- The guest scans the QR code on the table.
- The backend resolves the opaque token to a restaurant, room, table, and menu.
- The guest confirms an unambiguous context screen: "You are ordering at Sakura Kitchen, table 12".
- The guest joins the table's open visit, or raises a pending signal that staff confirm.
- The guest browses the menu, with unavailable items marked and not addable, a variant of an unavailable dish included.
- The guest builds a cart and submits an order.
- Staff see the order in a queue attached to the correct table, accept it, and update its status.
- The guest can order again without rescanning, request assistance, or request the bill.
- The guest pays in the app or asks staff to settle, and the visit closes.
- The guest sees a receipt listing the dishes they ordered.
- The guest selects a dish and creates a Bite prefilled with restaurant, dish, price, and currency, adding only a photo, rating, and comment.

## Validation On Every Scan

The backend validates, in order:

- The restaurant exists and is active
- Table ordering is enabled for that restaurant
- The table exists, is published, and is enabled
- The QR token is valid, active, and not revoked
- The restaurant is currently accepting orders
- The requested menu exists and is available

Each failure returns a distinct, actionable reason, not a generic error.

## Key Behaviours

- A QR token is opaque and non-guessable, and never encodes the table number.
- A QR code identifies a table context. It does not prove the guest is physically present. The operational flow is designed so a remote scan cannot cause harm beyond a rejected or staff-visible pending session.
- An order belongs to a visit, not directly to a table, so a party that moves keeps its orders.
- Order lines snapshot the menu item name, price, and currency at submission, so the price the guest saw is the price they are charged.
- Submission carries an idempotency key, so a double tap on a flaky restaurant network produces one order.
- Prices from a real order are stronger evidence than a typed price and bypass the suspicious-price warning from issue \#967 during Bite creation.

## The Address A Code Already Carries

The scan URL is not this use case's to choose any more. Issue \#1087 prints
stickers, and a sticker glued to a table cannot be corrected, so it fixed the
address at `https://bitetribe.app/t/{token}` - the origin from
`BITE_TRIBE_ORIGIN` in `libs/common/utils`, and a two-character path because
every character in the URL costs QR modules and every module costs printed
millimetres at the distance the code has to be read from.

Nothing answers `/t/:token` yet. A guest scanning a code printed today reaches
the consumer app's own handling of an unknown route, so mounting the resolver
there is the first thing this use case owes the codes already in restaurants.

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

## Success Criteria

- Scanning a table QR resolves to exactly one restaurant, room, and table, confirmed on screen before any order can be placed.
- A guest without an account can view the menu and order, if the restaurant allows it.
- An order submitted twice because of a flaky network creates one order.
- A revoked or rotated token stops working immediately.
- A Bite created from an order needs only a photo, a rating, and a comment, and carries the verified `restaurantId`.

## Open Product Questions

Tracked in [[Current State - Open Questions]]. Several block specific child issues, including shared versus per-guest orders, ordering without an account, session expiry, and the payment model.

## Related GitHub Scope

- Issue \#1072 - QR table menu and table ordering, with ten child issues
- Issue \#1099 - stable menu item identifiers, availability and price snapshots, the model this use case hangs its order lines from
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
