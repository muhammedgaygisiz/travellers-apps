# UC - Search In BiteTribe

## Status

Supported today and still expanding.

## Goal

Users can find people, Bites, and restaurants quickly.

## Actors

- Food lover
- Traveler
- Bite creator

## Current Flow

- User opens search.
- User enters search text.
- Search returns users, Bites, and restaurants.
- Search categories help separate result types.
- User can search Bites by city when enriched location data exists.
- Bite, restaurant, and city search results can switch between list and map views.

## Supported Evidence

- `search`
- `searchUsers`
- `searchBites`
- `searchBitesByCity`
- `searchRestaurants`

## Related GitHub Scope

- Issue \#843 covers broader universal search, fuzzy matching, and topic-specific search.
- Issue \#903 adds a list/map switch for location-aware search results.
- [[issue-974]] adds city search.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
