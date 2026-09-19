# UC - View Restaurant Menus

## Status

**Level:** L1

Supported today, and since issue [#370] by a reader with no BiteTribe account at all.
A restaurant that carries a menu resolves to this page, which renders the categories and
their priced dish rows and turns any item into a prefilled Bite. Its whole read is
accounted for: the contract below names the three states the page may be in and what each
one is allowed to claim, and `Reading A Menu Without An Account` names the four ways a
public read can be refused. Maintaining a menu is not done here -
[UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md) owns that, and since [#370]
that includes producing the code a restaurant prints.

## Goal

Users can inspect menu information connected to a Restaurant and its Bites.

This page owns what a menu shows to whoever is reading it - with an account or without
one - and how it answers a read that is slow, empty or unresolvable, including whether an
item the kitchen has taken off today reads as unavailable. Since issue [#370] that covers
the published menu a restaurant puts behind a printed code, which is a restaurant's menu
read by a stranger rather than anything to do with a table.

Editing a menu belongs to
[UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md), which also produces the code
the published address is printed on; the Bite the prefilled form goes on to create to
[UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md); and ordering from a menu at a table to
[UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md), which reaches this page's public read
from its own scan and owns nothing about it.

## Actors

- **Bite Creator** - acts: opens a menu from a restaurant, reads its categories and prices,
  and creates a Bite from an item.
- **Restaurant Owner** - not an actor here, and named because it maintains the menu this page
  reads and prints the code that leads to it; see `Status`.
- The published address is also read by somebody with **no account at all**. That is not an
  actor either: [User Roles](../product/user-roles.md) lists the _unauthenticated visitor_ under _Not roles_, and a
  published menu is one of the open routes it names. What such a reader is shown, and what
  they are not, is `Reading A Menu Without An Account`.

## Flow

- User opens a restaurant menu from a Bite.
- A signed-in user also reaches a menu with no Bite in front of it, by scanning the code a
  restaurant printed. `restaurant/:restaurantId/menu` resolves that restaurant's menu and
  hands the navigation on to `restaurant/:restaurantId/menu/:menuId`, which is the address
  the page is keyed on; both carry the auth guard, so this is the app's own menu page with
  its chrome and its Bite button (issue [#370]). Every other way in still arrives through a
  Bite, which is why the older route carries a `:biteId` it does not read.
- A reader with no account gets the published page instead; see
  `Reading A Menu Without An Account`.
- User can create a Bite from a menu item, which opens the Bite form prefilled with that Restaurant and dish. The prefilled draft is scoped to that one creation session; see [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).
- An item the kitchen is not serving reads as unavailable. `MenuItem.isAvailable` is absent-means-available, read through `isMenuItemAvailable`, and written by the business menu editor and nowhere else ([UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md)). Since issue [#923] a dish carrying `false` renders dimmed, with its price struck through and a translated `Not available` beside it, and the button that would create a Bite from it is disabled. The backend reads the same flag, so [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md) refuses to order such a dish and its add-to-cart button is disabled here too. Nothing in production sets the flag yet, because the business app has not launched.

## Menu Page State Contract

Issue [#1382]
gave the menu page an answer for every way its read can end. Before it, the page
rendered its final layout immediately and filled in as data arrived, so a menu
that had not loaded yet was indistinguishable from a Restaurant that genuinely
has no menu.

- Exactly one of three things is true at any moment: the menu is shown, the menu
  is still being read, or the menu is reported as unresolvable. The empty state
  ("no items here yet") belongs to a menu that loaded and really has no items,
  and can no longer be reached while a read is in flight.
- A read still in flight is answered by skeletons that trace this page's own
  shape - the full-bleed header photo, the place name, and the categories with
  their dish rows, priced on the right - so what stands in for the page looks
  like the page rather than like some other one. A Restaurant with no photo
  renders no header element at all once the read has settled, rather than
  reserving space for an image with no source.
- A menu that cannot be resolved - the document does not exist, the read failed,
  or it never came back within eight seconds - is reported by a blocking alert
  that refuses backdrop dismissal and offers the way back next to the read
  again, the same answer [UC - Inspect Bite Details](uc-inspect-bite-details.md) gives a failed Bite read.
  The skeletons stay underneath it, so nothing behind the alert claims the
  Restaurant has no menu.
- The alert waits for the active language before it is written. It translates
  synchronously, so a failure reported on a cold start straight onto a menu
  route would otherwise put raw keys on screen - the defect issue [#1186] fixed
  elsewhere.
- The alert is taken down with the page that raised it. Ionic mounts overlays on
  the app root, and one left behind sits over whatever the user navigated back
  to with a backdrop that swallows every tap (issue [#1304]).
- The failure is recorded against the menu id it belongs to, so a failure
  carried over from a menu left behind never describes the menu now on screen.
- A route without a `menuId` is not a failure. Nothing has been asked for.

## Reading A Menu Without An Account

A restaurant publishes its menu at `m/:restaurantId` and prints that address on a code of
its own - a window sticker, a menu card, a table tent. Issue [#1102] built the page; issue
[#370] gave it a way in, and with it the independence that makes it a menu rather than a
table feature: the code is produced on the restaurant's own page, it names a restaurant
rather than a table, and a restaurant with no floor plan, no tables and no ordering can
publish one. What [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md) does is arrive here from a
scan of its own.

- **The menu is served by a callable, not by a read rule** (`RD-TS-7`). A page that renders
  a restaurant's name needs a document that also carries its owner, its claim status and its
  whole ordering configuration; `loadPublicMenu` assembles three fields instead. It takes a
  restaurant and not a token, because a restaurant that publishes a link may have no printed
  codes at all.
- **Four refusals, all about there being nothing to read**: the restaurant does not exist, the
  restaurant is not one whose menu may be published under its name, it names no menu, or the
  menu has no item in any category. None is about ordering, and the last is deliberately
  weaker than the scan's own: a menu whose every dish is marked off cannot be ordered from
  and is still worth reading.
- **Only a held restaurant may publish** (`RD-PM-5`). An unheld restaurant's menu is whatever
  was derived from other people's Bites, and putting that on a public page under the
  restaurant's name states prices nobody there ever confirmed. A restaurant whose assignment
  was revoked is refused for the same reason.
- **The published page renders less than the page next door.** No chrome, because the reader
  did not arrive from anywhere inside the app; and no button that turns a dish into a Bite,
  because it would open a sign-up for a product they came here to read a menu of. The
  renderer itself is the same one - two menu renderers is how two menus start disagreeing
  about what an unavailable dish looks like.
- **It offers the app under the menu rather than over it** (issue [#370]). It is the one
  surface where somebody who has never heard of BiteTribe is holding a BiteTribe page, and an
  interstitial in front of a restaurant's menu is the wall the address exists to remove. The
  offer renders nothing inside the native wrapper, so a reader who already has the app is not
  offered it.
- **Somebody who has the app and is signed in to it is not shown this page.** The printed
  address is one address for everybody who points a camera at it, and the route decides:
  a member is handed the app's own menu page, and everybody else - an anonymous table guest
  included - reads the published one. The menu is resolved before that redirect, so a
  restaurant that printed a code and has no menu settles on the refusal above rather than on
  a route that would send it back.
- **A member who has not finished onboarding is sent through the assistant first**, because
  the route they are handed to carries the auth guard and the onboarding gate with it. The
  displaced address is remembered, so the menu is what they land on afterwards. Whether that
  is the right answer is issue [#1654].

## MVP Classification

**[MVP]** - the whole page. A restaurant with a menu offers a button that lands here, so
this page is reachable in the shipped app and a page that misreports whether a menu exists
is a defect at launch rather than a missing extra.

## App Store Review Area

Relevant on one count only, and it changes no declaration. Issue [#370] added `/m/*` to the
associated domains, so a scanned menu code opens the app rather than a browser tab. The
entitlement and the host were already declared and in use; this is a path under the same
host, on all three hosts that serve the build.

Nothing here requests a permission. The page reads a menu by the route's `menuId` and asks
the device for nothing - not the camera, since a printed code is scanned by the phone's own
camera app and BiteTribe never opens a scanner. The restaurant selector it uses returns
`undefined` without a GPS position, which is why the save path reads the restaurant id from
the route instead; the same selector blanks the business restaurant page, which is issue
[#1653]. The published read sends no user identifier and is attested by App Check alone, so
no privacy label entry changes. Table ordering shares this page's library and belongs to
[UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md).

## Supported Evidence

- `bite/:biteId/restaurant/:restaurantId/menu/:menuId`
- `restaurant/:restaurantId/menu` and `restaurant/:restaurantId/menu/:menuId`
- `m/:publicRestaurantId`, and `loadPublicMenu`
- Menu API.
- Business `restaurant/:restaurantId/menu/:menuId`.

## Related GitHub Scope

- Issue [#734], the `User wants to see a menu of a restaurant` epic, covered menu
  functionality and the actions around menu items. Closed as completed.
- Issue [#735] is the `Restaurant Interaction Platform` epic - floor plan, tables, QR
  ordering and Bites from orders - and is open. It reaches menu items only through table
  ordering, which [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md) owns; it is not this page's
  future work.
- Issue [#1382] owns the state contract above. Closed as completed.
- Issue [#1102] built the published menu page, its callable and its refusals. Closed as
  completed; it sat under the table epic because that is where the need first appeared.
- Issue [#370] gave the published address a code to be printed on, the associated-domain
  entry that opens it in the app, and the in-app route a scan lands on. Closed as completed,
  and it delivered issue [#371], the same feature from the restaurant's side.
- Issue [#1654] asks whether a member with unfinished onboarding should read the published
  page rather than be sent through the assistant. Open.
- Issue [#1653] blanks the business restaurant page, and with it the code that leads here,
  whenever the device reports no GPS position. Open.

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

## Related Pages

- [Recorded Decisions](../decisions/recorded-decisions.md) - `RD-PM-1` to `RD-PM-7` bind this page, and `RD-TS-7` binds the callable it reads through
- [Personas](../product/personas.md) - the audiences the `Actors` mapping displaced: the food lover, the traveler,
  and the restaurant owner or business maintainer
- [UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md) - the business menu route named in
  `Flow` and `Supported Evidence`, and the editing this page does not do
- [UC - Browse Restaurants And Places](uc-browse-restaurants-and-places.md) - the restaurant page whose menu button lands here
- [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md) - the prefilled Bite an item creates
- [UC - Inspect Bite Details](uc-inspect-bite-details.md) - the failed-read answer this page's alert is modelled on
- [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md) - table ordering, which shares this page's
  library and owns [#735]

[#734]: https://github.com/muhammedgaygisiz/travellers-apps/issues/734
[#735]: https://github.com/muhammedgaygisiz/travellers-apps/issues/735
[#923]: https://github.com/muhammedgaygisiz/travellers-apps/issues/923
[#1186]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1186
[#1304]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1304
[#1382]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1382
[#370]: https://github.com/muhammedgaygisiz/travellers-apps/issues/370
[#371]: https://github.com/muhammedgaygisiz/travellers-apps/issues/371
[#1102]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1102
[#1653]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1653
[#1654]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1654
