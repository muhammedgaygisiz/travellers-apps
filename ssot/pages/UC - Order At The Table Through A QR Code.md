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
- The guest browses the menu, with unavailable items marked and not addable.
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

## Prerequisite In The Existing Model

`MenuItem` in `libs/bite-tribe-common/model/src/lib/menu.ts` has no identifier. Items are array entries inside `Menu.categories[]`, addressable only by name and array index, so renaming or reordering would silently repoint historic orders and menu-item-to-Bite links. Issue \#1099 adds stable ids and a migration before anything else in this use case.

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
