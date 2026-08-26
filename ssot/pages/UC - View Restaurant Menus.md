# UC - View Restaurant Menus

## Status

Supported today and still expanding.

## Goal

Users can inspect menu information connected to a Restaurant and its Bites.

## Actors

- Food lover
- Traveler
- Restaurant owner or business maintainer

## Current Flow

- User opens a restaurant menu from a Bite.
- User can create a Bite from a menu item, which opens the Bite form prefilled with that Restaurant and dish. The prefilled draft is scoped to that one creation session; see [[UC - Create And Maintain Personal Bites]].
- Business users can maintain menus from the business app.

## Menu Page State Contract

Issue [#1382](https://github.com/muhammedgaygisiz/travellers-apps/issues/1382)
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
  again, the same answer [[UC - Inspect Bite Details]] gives a failed Bite read.
  The skeletons stay underneath it, so nothing behind the alert claims the
  Restaurant has no menu.
- The alert waits for the active language before it is written. It translates
  synchronously, so a failure reported on a cold start straight onto a menu
  route would otherwise put raw keys on screen - the defect issue #1186 fixed
  elsewhere.
- The alert is taken down with the page that raised it. Ionic mounts overlays on
  the app root, and one left behind sits over whatever the user navigated back
  to with a backdrop that swallows every tap (issue #1304).
- The failure is recorded against the menu id it belongs to, so a failure
  carried over from a menu left behind never describes the menu now on screen.
- A route without a `menuId` is not a failure. Nothing has been asked for.

## Supported Evidence

- `bite/:biteId/restaurant/:restaurantId/menu/:menuId`
- Menu API.
- Business `restaurant/:restaurantId/menu/:menuId`.

## Related GitHub Scope

- Issue \#734 and Issue \#735 cover menu functionality and future actions around menu items.

## Related Domains

- [[Restaurant]]
- [[Bite]]
