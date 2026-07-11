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
- User enters dish details, place or restaurant context, price, currency, tags, rating, description, and image context.
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
- Bite page suspicious price validation.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
