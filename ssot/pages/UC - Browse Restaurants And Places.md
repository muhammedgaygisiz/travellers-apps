# UC - Browse Restaurants And Places

## Status

Supported today and still expanding.

## Goal

Users can understand the place or restaurant context around a Bite.

## Actors

- Food lover
- Traveler
- Restaurant owner or business maintainer

## Current Flow

- User navigates from a Bite to a verified Restaurant or unverified place page.
- During Bite creation, user selects a nearby verified restaurant, unverified restaurant, Google Place, or explicit custom place through the selector before saving.
- User can inspect restaurant-related Bites.
- Restaurant pages can show ratings derived from Bites, tags, menu entry points, and verification distinctions.

## Restaurant Page State Contract

Issue [#1381](https://github.com/muhammedgaygisiz/travellers-apps/issues/1381)
gave the verified restaurant page the same treatment issue #1382 gave the menu
page. Before it, the page rendered its final layout immediately and filled in as
the reads landed, so a restaurant that had not loaded yet was indistinguishable
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

- Issue \#734 covers richer restaurant menu and restaurant profile behavior.

## Related Domains

- [[Restaurant]]
- [[Bite]]
