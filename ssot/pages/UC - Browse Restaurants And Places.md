# UC - Browse Restaurants And Places

## Status

**Level:** L0.

Supported today. A Bite leads to a verified restaurant page or an unverified place page;
both render the ratings, tags and context derived from Bites, and the verified page
resolves to a menu when the restaurant carries one. The page is either loading or loaded
and offers no action until it is loaded - the contract below says why and what that costs
if it is broken.

## Goal

Users can understand the place or restaurant context around a Bite.

This page owns what the restaurant and place pages show and in what order they are allowed
to show it. What a menu itself contains belongs to [[UC - View Restaurant Menus]], and the
selector that attaches a place to a Bite in the first place to
[[UC - Create And Maintain Personal Bites]].

## Actors

- **Bite Creator** - acts: opens a restaurant or place page from a Bite, reads its context,
  and follows it on to the menu or to the Bites recorded there. Nothing on these pages
  behaves differently for any other role - the consumer app reads no ownership or role
  claim here.

## Flow

- User navigates from a Bite to a verified Restaurant or unverified place page.
- During Bite creation, user selects a nearby verified restaurant, unverified restaurant, Google Place, or explicit custom place through the selector before saving.
- User can inspect restaurant-related Bites.
- Restaurant pages can show ratings derived from Bites, tags, menu entry points, and verification distinctions.

## Restaurant Page State Contract

Issue [#1381](https://github.com/muhammedgaygisiz/travellers-apps/issues/1381)
gave the verified restaurant page the loading treatment issue \#1382 gave the
menu page, without the failed state that issue also added there. Before it,
the page rendered its final layout immediately and filled in as the reads
landed, so a restaurant that had not loaded yet was indistinguishable
from one whose optional fields are genuinely empty, and its actions were on
screen before the state backing them existed.

- The page is either loading or loaded. While the restaurant document is
  undefined it renders skeletons tracing its own shape - the header photo, the
  name and distance, the rating line, the description and links, the tags, the
  opening-hours rows, the address and the map - and the header runs the loading
  bar with them, per [[Implementation - Feature Patterns]].
- The empty states ("no description available", "no social media links", "no
  ratings yet") belong to a restaurant that loaded and really has those fields
  empty. They can no longer be reached while the read is in flight.
- No action is offered while loading. Every button on this page acts on the
  restaurant, and the menu button in particular dead-ends without it: the tap
  either did nothing, or fell through to `gotoDynamicMenu`, which routes by
  place name and lands on the empty-menu page for a restaurant that does have a
  menu.
- The menu button is rendered only for a loaded restaurant that carries a menu
  id, the same way the Bites button is gated on its Bite count, so the menu
  entry point always resolves to the id-based menu route. A restaurant with no
  menu offers no button rather than one that reports the menu as absent.

## MVP Classification

**[MVP]** - the whole page. A Bite that cannot be followed to the place it was eaten is a
photo with a price on it, so the restaurant and place pages are part of what a Bite means
rather than an addition to it.

## App Store Review Area

Not relevant, because nothing here requests a permission or changes a store declaration.
The distance these pages show is computed in the store, `haversineDistance` against the
app-level GPS position that [[UC - Discover Bites]] and onboarding obtain; this page reads
that position and never asks for one. It would become relevant if a restaurant page began
requesting a live position of its own, or if the place data it renders started coming from
a source [[Implementation - Store Declarations]] does not cover.

## Supported Evidence

- Restaurant/place routes.
- Restaurant API.
- Restaurant page components.
- Shared restaurant selector.
- `searchNearbyPlaces`
- Restaurant Bites route.
- Playwright coverage for Restaurant search, verified and unverified place
  context, aggregate ratings and tags, associated Bites, and empty results.

## Related GitHub Scope

- Issue \#734, the `User wants to see a menu of a restaurant` epic, covered richer restaurant
  menu and restaurant page behaviour. Closed as completed - it is delivered, not planned.
- Issue \#1381 owns the state contract above. Closed as completed.

## Related Domains

- [[Restaurant]]
- [[Bite]]

## Related Pages

- [[Personas]] - the audiences the `Actors` mapping displaced: the food lover, the traveler,
  and the restaurant owner or business maintainer
- [[UC - View Restaurant Menus]] - the menu this page's button resolves to, and its own
  loading and failed states
- [[UC - Create And Maintain Personal Bites]] - the restaurant and place selector named in
  `Flow`, and the Bites these pages aggregate
- [[UC - Inspect Bite Details]] - the Bite a visit to these pages starts from
- [[Implementation - Feature Patterns]] - the loading-bar pattern the header follows
