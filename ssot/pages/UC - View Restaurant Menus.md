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

## Supported Evidence

- `bite/:biteId/restaurant/:restaurantId/menu/:menuId`
- Menu API.
- Business `restaurant/:restaurantId/menu/:menuId`.

## Related GitHub Scope

- Issue \#734 and Issue \#735 cover menu functionality and future actions around menu items.

## Related Domains

- [[Restaurant]]
- [[Bite]]
