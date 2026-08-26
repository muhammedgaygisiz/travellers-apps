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
- A read still in flight is answered by skeletons, including one for the header
  image, so nothing reserves layout space for a photo that has no source. Once
  the read has settled, an absent photo renders no element at all.
- A menu that cannot be resolved - the document does not exist, the read failed,
  or it never came back within eight seconds - is reported in the page, offering
  the way back and the read again. It is stated in the page rather than in an
  alert so the answer survives a dismissed overlay and the state is reachable in
  Storybook and in visual regression.
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
