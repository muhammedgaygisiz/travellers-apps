# UC - Contact A Restaurant And Plan A Visit

## Status

**Level:** L0.

An idea with an epic and no code. The page began as
`Expand Restaurant Menus Into Actionable Menu Journeys`, whose goal was that "menu items should
become actionable starting points for food discovery and restaurant interaction". Two of the
five actions it listed turned out to be delivered and owned - creating a Bite from a menu item
is [[UC - View Restaurant Menus]]'s and already ships, and a dish's availability is that page's
to show and [[UC - Maintain Restaurants In The Business App]]'s to set. What was left is
reaching the restaurant itself rather than the dish, which is this page.

In the code there is nothing to point at: `Restaurant` carries no phone number and no email,
no surface offers a contact action, and nothing resembling a visit plan or a reservation
exists. Issue \#735, the Restaurant Interaction Platform epic, does not cover any of it either

- its five stages are ownership, floor plan, table management, QR ordering, and payment with
  Bite creation - and it names "Reservation management and booking windows" in its own
  out-of-scope list. Issue \#1617 was opened for exactly this gap and owns all three actions; it
  has no child issues yet, because each of them is a product decision before it is work.

## Goal

A diner who has decided on a restaurant can act on that decision: reach the restaurant, plan
when to go, and hold a table where the restaurant supports it.

This page owns those three actions and nothing else. The surfaces they would be reached from
belong elsewhere - the restaurant page to [[UC - Browse Restaurants And Places]] and the menu
to [[UC - View Restaurant Menus]] - as does everything a diner does with a dish rather than
with the restaurant.

## Actors

- **Bite Creator** - acts: contacts the restaurant, plans a visit, and reserves a table where
  one can be reserved. No role or entitlement is involved; this is a diner acting on a public
  restaurant page.
- **Restaurant Owner** - does not act, for want of anything to act on. Whoever would receive a
  message or a reservation has no surface and no mechanism, and which role answers is part of
  what is undecided here rather than a fact this page can state.

## Flow

- User reaches these actions from a Restaurant page or from a dish on its menu. Both surfaces are owned elsewhere - [[UC - Browse Restaurants And Places]] and [[UC - View Restaurant Menus]] - and neither offers them today.
- User contacts the Restaurant. **Not built; owned by issue \#1617.** `Restaurant` has no phone number or email address, and no surface offers a contact action. What "contact" means - a call, a message held in the product, or a link out - is a decision that epic carries, and it changes what the store declarations have to say.
- User plans a visit. **Not built; owned by issue \#1617.** Nothing in the product represents an intended visit. Opening hours exist on the Restaurant and are shown by [[UC - Browse Restaurants And Places]]; planning against them does not. Whether a planned visit is an object the product holds or a hand-off to the device calendar is undecided.
- User reserves a table where the restaurant supports it. **Not built; declined by \#735 and owned by \#1617.** The platform epic lists "Reservation management and booking windows" as out of scope for itself, which is why this has an epic of its own. Whether reservations run in the product or are brokered to whatever the restaurant already uses is undecided.

## MVP Classification

**[Secondary]** - the whole page. Nothing here is built, nothing is scheduled, and no epic owns
any of it; none of it can be strictly required for the initial release.

Not on this page: creating a Bite from a menu item and reading whether a dish is available,
which are [[UC - View Restaurant Menus]]'s, and setting that availability, which is
[[UC - Maintain Restaurants In The Business App]]'s.

## App Store Review Area

Not relevant, because nothing here exists to be reviewed. It would become relevant the moment
"contact" is decided: a `tel:` or `mailto:` link leaves the app, and a phone call or a message
held in the product changes what the store declarations say about data collected and shared.
Neither is a question to answer before the behaviour is scoped.

## Related GitHub Scope

- Issue \#1617 is the epic and owns all three actions: reaching a restaurant, planning a visit
  and reserving a table. Open, with no child issues yet - each action is a product decision
  before it is work, and the epic carries those decisions
- Issue \#735, the Restaurant Interaction Platform epic, is cited as the boundary rather than
  as an owner. None of its five stage epics - \#1069, \#1070, \#1071, \#1072, \#1073 - covers
  any of this, and reservations are in its out-of-scope list by name, which is why \#1617
  exists. Open

## Related Domains

- [[Restaurant]]

## Related Pages

- [[Personas]] - the food lover, the traveler and the restaurant owner this page used to name
  as actors
- [[epic-735]] - the platform epic that draws the boundary
- [[UC - Browse Restaurants And Places]] - the restaurant page these actions would sit on
- [[UC - View Restaurant Menus]] - the menu route in, and the two actions that left this page
- [[UC - Maintain Restaurants In The Business App]] - where a dish's availability is set
- [[UC - Order At The Table Through A QR Code]] - what a diner does once they have arrived
