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
- The app warns when the entered price looks suspiciously high.
- The app stores the Bite and uploads the image.
- User can edit the Bite later.

## Supported Evidence

- `new-bite`
- `bite/:biteId/edit`
- Bite API create, edit, upload, and image-path utilities.
- Bite page suspicious price validation.

## Related Domains

- [[Bite]]
- [[User]]
- [[Restaurant]]
