# UC - Create And Maintain Personal Bites

## Status

Supported today.

## Goal

Users can create and maintain real dish-level food experiences.

## Actors

- Bite creator
- Food lover

## Current Flow

- User creates a new Bite.
- User enters dish details, price, currency, tags, rating, description, and image context.
- User selects a restaurant/place through the picker before saving; direct free-text place entry is no longer the form-level path.
- When a selected restaurant or other location source changes the Bite position, the form map refits its camera to the new marker.
- If no nearby verified restaurant, unverified restaurant, or Google Place is correct, the selector keeps the explicit `Use: "abc"` custom-place fallback.
- When a Bite position is available, the app prefills the currency from that location; the user's preferred currency remains the fallback.
- User can still manually correct the currency before saving.
- The app warns when the entered price looks suspiciously high.
- The app stores the Bite and uploads the image.
- User can edit the Bite later.

## Supported Evidence

- `new-bite`
- `bite/:biteId/edit`
- Bite API create, edit, upload, and image-path utilities.
- `getCurrencyByPosition`
- `searchNearbyPlaces`
- Shared restaurant selector.
- Bite page suspicious price validation.
- Playwright create-Bite E2E smoke coverage.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
