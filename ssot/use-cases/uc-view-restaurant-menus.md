# UC - View Restaurant Menus

## Status

**Level:** L0.

Supported today. A restaurant that carries a menu resolves to this page, which renders the
categories and their priced dish rows and turns any item into a prefilled Bite. Its whole
read is accounted for: the contract below names the three states the page may be in and
what each one is allowed to claim. Maintaining a menu is not done here -
[UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md) owns that.

## Goal

Users can inspect menu information connected to a Restaurant and its Bites.

This page owns what the consumer menu page shows and how it answers a read that is slow,
empty or unresolvable - including whether an item the kitchen has taken off today reads as
unavailable, which it does not yet. Editing a menu belongs to
[UC - Maintain Restaurants In The Business App](uc-maintain-restaurants-in-the-business-app.md), the Bite the prefilled form goes on to
create to [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md), and ordering from a menu at a table
to [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md).

## Actors

- **Bite Creator** - acts: opens a menu from a restaurant, reads its categories and prices,
  and creates a Bite from an item. The business user named in `Flow` acts in the business
  app, not on this page.

## Flow

- User opens a restaurant menu from a Bite.
- User can create a Bite from a menu item, which opens the Bite form prefilled with that Restaurant and dish. The prefilled draft is scoped to that one creation session; see [UC - Create And Maintain Personal Bites](uc-create-and-maintain-personal-bites.md).
- Business users can maintain menus from the business app.
- An item the kitchen is not serving reads as unavailable. **Intended, not met.** The flag exists and is written - `MenuItem.isAvailable`, absent meaning available, read through `isMenuItemAvailable` - and the business menu editor sets it, but no consumer surface reads it: a dish marked sold out renders on this page exactly as one that is not. The backend does read it, so [UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md) refuses to order such a dish; a diner browsing the menu cannot tell. Unreachable in production today, because the business app has not launched and nothing sets the flag.

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

## MVP Classification

**[MVP]** - the whole page. A restaurant with a menu offers a button that lands here, so
this page is reachable in the shipped app and a page that misreports whether a menu exists
is a defect at launch rather than a missing extra.

## App Store Review Area

Not relevant, because nothing here requests a permission or changes a store declaration.
The page reads a menu document by the route's `menuId` and asks the device for nothing; the
restaurant selector it uses returns `undefined` without a GPS position, which is why the
save path reads the restaurant id from the route instead. It would become relevant through
table ordering, which shares this page's library but belongs to
[UC - Order At The Table Through A QR Code](uc-order-at-the-table-through-a-qr-code.md).

## Supported Evidence

- `bite/:biteId/restaurant/:restaurantId/menu/:menuId`
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

## Related Domains

- [Restaurant](../domain/restaurant.md)
- [Bite](../domain/bite.md)

## Related Pages

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
[#1186]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1186
[#1304]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1304
[#1382]: https://github.com/muhammedgaygisiz/travellers-apps/issues/1382
