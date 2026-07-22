# UC - Discover Bites

## Status

Supported today.

## Goal

Food lovers can discover real dishes nearby or in a broader feed before deciding what to eat.

## Actors

- Food lover
- Traveler
- Bite creator

## Current Flow

- User opens the home feed.
- User browses Bites.
- User can switch to map view.
- Map zoom controls and zoom gestures are available to every user regardless of subscription tier.
- User can filter or search within the feed.
- Nearby Bites can be loaded through backend-assisted location loading.
- When live Bite updates add markers, the map should preserve the user's current pan and zoom after the initial marker fit.

## Supported Evidence

- `home`
- `home/map-view`
- `loadBitesByLocation`
- Bite API loading by location.
- Shared `bt-map` marker update behavior.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
